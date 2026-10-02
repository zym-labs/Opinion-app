# Opinion — Stage 3: Database Structure

Postgres (Supabase). Builds on [SPEC.md](SPEC.md), [Stage 1](STAGE1_APP_FLOW.md), [Stage 2](STAGE2_AUTH_ONBOARDING.md).

## 1. Design principles

1. **Privacy by structure:** the creator–voter link and who-voted-what are readable only by server code (service role). Clients never select from `votes` or `reasons` directly.
2. **Aggregates are computed server-side** and stored in `poll_results`; clients read only those.
3. **Row Level Security (RLS) on every table**; default deny.
4. **State changes happen in database functions / Edge Functions**, not client updates (vote, publish, close, view result, delete account).
5. UUID primary keys, `timestamptz` everywhere, soft states via enums rather than deletes where history matters.

## 2. Entity overview

```
auth.users 1─1 profiles ─┬─< user_categories >─ categories
                         ├─< user_communities >─ communities ─< community_domains
                         ├─< campus_verifications
                         ├─< devices
                         ├─< consents
                         ├─< credit_ledger
                         ├─< hidden_creators
                         └─< notifications
profiles 1─< polls ─┬─< poll_options
                    ├─< poll_target_categories >─ categories
                    ├─ community_id ─ communities
                    ├─< votes ─1 reasons
                    ├─1 poll_results ─< featured_insights ─ reasons
                    ├─< result_views
                    └─< ai_jobs
reports ─> (poll | reason | featured_insight)      moderation_actions ─> reports / profiles
```

## 3. Enums

```sql
create type account_status   as enum ('active','suspended','deleted');
create type onboarding_step  as enum ('signed_in','age_verified','terms_accepted','categories_chosen','communities_done','complete');
create type age_source       as enum ('self','store_signal');
create type poll_type        as enum ('expert','community');
create type poll_status      as enum ('draft','active','closing','summarizing','completed','failed_ai','removed','deleted');
create type moderation_state as enum ('pending','approved','rejected');
create type vote_side        as enum ('a','b');
create type community_kind   as enum ('topic','campus');
create type report_target    as enum ('poll','reason','featured_insight');
create type report_reason    as enum ('spam','hate','harassment','personal_info','sexual','self_harm','other');
create type report_status    as enum ('open','actioned','dismissed');
create type credit_reason    as enum ('signup_bonus','vote','poll_publish','poll_refund','admin_adjust');
create type notif_type       as enum ('new_polls_digest','poll_ended','summary_ready','insight_featured','moderation_outcome');
```

## 4. Tables

### Users

```sql
profiles (
  id               uuid pk references auth.users on delete cascade,
  handle           text unique not null,            -- u_8f3k2q, admin-only
  status           account_status not null default 'active',
  onboarding_step  onboarding_step not null default 'signed_in',
  birth_year       smallint check (birth_year between 1900 and extract(year from now())-18),
  age_source       age_source,
  age_checked_at   timestamptz,
  categories_changed_at timestamptz,               -- 7-day limit
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
)

categories (id smallserial pk, slug text unique, name text, is_sensitive bool default false, -- medicine/law/money → disclaimer
            archived bool default false, sort smallint)
user_categories (user_id uuid → profiles, category_id smallint → categories, pk(user_id, category_id))
  -- max 5 enforced by trigger

communities (id uuid pk, slug text unique, name text, description text, kind community_kind,
             archived bool default false, created_at timestamptz)
community_domains (community_id uuid → communities, domain text, pk(community_id, domain))  -- campus allowlist
user_communities (user_id → profiles, community_id → communities, joined_at, pk(user_id, community_id))
  -- trigger: campus communities require a valid campus_verifications row

campus_verifications (
  id uuid pk, user_id → profiles, community_id → communities,
  email_hash text unique not null,      -- sha256(lower(email) || pepper): one address = one account
  domain text not null, verified_at timestamptz, expires_at timestamptz   -- +12 months
)

devices (id uuid pk, user_id → profiles on delete cascade, platform text, push_token text unique,
         last_seen_at timestamptz)

consents (id uuid pk, user_id → profiles on delete set null, kind text,   -- 'terms','privacy','guidelines'
          version text, accepted_at timestamptz)                           -- kept anonymised 1y after deletion

hidden_creators (user_id → profiles, creator_id → profiles, source_poll_id → polls, created_at,
                 pk(user_id, creator_id))
```

### Credits (ledger, never a mutable balance)

```sql
credit_ledger (
  id bigserial pk, user_id → profiles on delete cascade,
  delta smallint not null, reason credit_reason not null,
  poll_id uuid null, vote_id uuid null,
  available_at timestamptz not null default now(),   -- vote credits: account age ≥ 24h
  created_at timestamptz default now()
)
view credit_balance as select user_id, sum(delta) filter (where available_at <= now()) from credit_ledger group by 1;
```
Rule: 3 votes = 1 credit — so each vote inserts `delta = 1` and posting costs 3 (balance shown as polls = floor(balance/3)). Signup bonus = 3.

### Polls

```sql
polls (
  id              uuid pk,
  creator_id      uuid → profiles on delete set null,
  type            poll_type not null,
  is_taste        boolean not null default false,       -- reasons optional
  question        text not null check (char_length(question) between 5 and 120),
  community_id    uuid null → communities,              -- required iff type='community'
  age_min         smallint null, age_max smallint null, -- expert only; check (age_max - age_min >= 5)
  duration_hours  smallint not null check (duration_hours between 3 and 24),
  status          poll_status not null default 'draft',
  moderation      moderation_state not null default 'pending',
  estimated_audience int,
  published_at    timestamptz, closes_at timestamptz,   -- closes_at = published_at + duration
  vote_count      int not null default 0,               -- creator sees this live
  removed_reason  text,
  created_at      timestamptz default now(),
  check ((type='community') = (community_id is not null)),
  check (type='expert' or (age_min is null and age_max is null))
)

poll_options (
  poll_id → polls on delete cascade, side vote_side,
  label text check (char_length(label) <= 60),
  image_path text,                    -- storage bucket 'poll-images/{poll_id}/{side}.webp'
  image_moderation moderation_state,
  pk(poll_id, side),
  check (label is not null or image_path is not null)
)

poll_target_categories (poll_id → polls on delete cascade, category_id → categories, pk(poll_id, category_id))
  -- 1..5 for expert polls (trigger)
```

### Votes & reasons (service-role only)

```sql
votes (
  id            uuid pk,
  poll_id       uuid → polls,
  voter_id      uuid null → profiles on delete set null,    -- nulled on account deletion
  side          vote_side not null,
  predicted_side vote_side null,                            -- "what will most pick?"
  feature_consent boolean not null,
  created_at    timestamptz default now(),                  -- never exposed to clients
  unique (poll_id, voter_id)                                -- one vote per user
)

reasons (
  vote_id       uuid pk → votes on delete cascade,
  body          text not null check (char_length(body) <= 200),
  moderation    moderation_state not null default 'pending',
  moderation_flags jsonb,                                   -- provider categories/scores
  pii_redacted  text,                                       -- version safe for AI/featuring
  injection_flag boolean default false
)
```
Min 20 chars enforced in the vote function when reasons are required (expert, non-taste).

### Results

```sql
poll_results (
  poll_id        uuid pk → polls,
  total_votes    int not null,
  votes_a int, votes_b int,                 -- null when total < 10 (not enough responses)
  pct_a numeric(5,2), pct_b numeric(5,2),
  winner         vote_side null,            -- null on tie or below threshold
  predicted_a_pct numeric(5,2),
  summary_majority text, summary_minority text,   -- minority null if <5 minority reasons
  summary_model  text, summary_version smallint,
  generated_at   timestamptz
)

featured_insights (
  id uuid pk, poll_id → poll_results, reason_vote_id → reasons,
  quote text not null,                       -- exact match of pii_redacted text
  side vote_side, rank smallint check (rank between 1 and 3),
  removed boolean default false,
  unique (poll_id, rank)
)

result_views (
  poll_id → polls, user_id → profiles on delete cascade,
  first_opened_at timestamptz, viewed_at timestamptz,   -- viewed = closed or +10s
  in_majority boolean, predicted_correctly boolean,     -- snapshot for profile stats and F-06
  pk(poll_id, user_id)
)
```
`result_views` rows are created for every voter when a poll completes ("Available"); `viewed_at` set → hidden from feed.

### AI pipeline

```sql
ai_jobs (
  id uuid pk, poll_id → polls, attempt smallint default 1,
  status text check (status in ('queued','running','succeeded','failed')),
  model text, input_reason_count int, error text,
  tokens_in int, tokens_out int, cost_usd numeric(8,4),
  started_at timestamptz, finished_at timestamptz
)
```

### Safety

```sql
reports (
  id uuid pk, reporter_id → profiles on delete set null,
  target_type report_target, poll_id uuid, reason_vote_id uuid, featured_insight_id uuid,
  reason report_reason, note text check (char_length(note) <= 300),
  status report_status default 'open', severity smallint,   -- self_harm/hate = high
  created_at timestamptz, resolved_at timestamptz,
  unique (reporter_id, target_type, coalesce(poll_id, reason_vote_id, featured_insight_id))
)

moderation_actions (
  id uuid pk, admin_id → profiles, report_id → reports null,
  target_user_id → profiles null, poll_id uuid null,
  action text check (action in ('dismiss','remove','warn','suspend','unsuspend','restore')),
  rule text, note text, created_at timestamptz
)
```

### Notifications

```sql
notifications (
  id uuid pk, user_id → profiles on delete cascade, type notif_type,
  poll_id uuid null, payload jsonb, read_at timestamptz, sent_at timestamptz, created_at timestamptz
)
notification_prefs (user_id pk → profiles, new_polls bool, poll_ended bool, summary_ready bool,
                    insight_featured bool, digest_hour smallint default 18, tz text)
```

## 5. Row Level Security summary

| Table | Client select | Client insert/update | Notes |
|---|---|---|---|
| profiles | own row (limited columns via view `me`) | none — via functions | handle, is_admin hidden |
| categories, communities | all non-archived | none | |
| user_categories / user_communities | own | via functions (limits, campus check) | |
| polls | `active` polls matching the user's targeting (view `feed_polls`), own polls (any status) | via `create_poll`, `publish_poll`, `delete_poll` | `creator_id` never exposed in feed view |
| poll_options | if parent poll visible | via functions | |
| votes, reasons | **none** | via `cast_vote` only | |
| poll_results, featured_insights | voters with a `result_views` row not yet viewed, or the creator | none | |
| result_views | own | via `mark_result_viewed` | |
| credit_ledger | own (balance view) | none | |
| reports | none | via `submit_report` | |
| hidden_creators | own | via `hide_creator` (by poll id; creator id resolved server-side) | |
| notifications, prefs | own | prefs update own; read_at own | |
| moderation_actions, ai_jobs | admins only | admins / server | |

## 6. Key server functions (detailed in Stage 4)

| Function | Does |
|---|---|
| `estimate_audience(targeting)` | Count of eligible users (active, onboarded, matching, not creator, not hiding the creator); rounds to the nearest 10 |
| `publish_poll(poll_id)` | Checks moderation approved, audience ≥ 20, balance ≥ 3; spends credits; sets `active`, `closes_at` |
| `cast_vote(poll_id, side, reason, predicted, consent)` | Eligible + active + not creator + not already voted + reason rules; inserts vote/reason; +1 credit; increments `vote_count`; queues reason moderation |
| `delete_poll(poll_id)` | Only creator, only `vote_count = 0`; refund |
| `close_due_polls()` | pg_cron every minute: `active` & `closes_at <= now()` → `closing` → compute aggregates → `summarizing` (≥10 votes) or `completed` |
| `mark_result_viewed(poll_id)` | Sets `viewed_at` |
| `hide_creator(poll_id)` / `submit_report(...)` | Safety actions |
| `delete_account()` | Stage 2 §7 transaction |

## 7. Indexes

```sql
create index on polls (status, closes_at);                       -- closer job
create index on polls (creator_id, created_at desc);              -- My Polls
create index on poll_target_categories (category_id, poll_id);    -- feed matching
create index on polls (community_id) where status = 'active';
create index on votes (voter_id, created_at desc);                -- profile stats, "already voted"
create index on result_views (user_id) where viewed_at is null;   -- Results ready
create index on reports (status, severity desc, created_at);      -- moderation queue
create index on credit_ledger (user_id);
create index on profiles (birth_year) where status = 'active';
```

## 8. Feed query (logic)

An active poll is shown to the user if all of these hold:
- the user is not the creator, hasn't voted, and doesn't hide the creator;
- moderation is approved;
- **expert polls:** the user has at least one of the target categories, and their age falls within the age range if one is set;
- **community polls:** the user is a member of the community.

Sort by `closes_at` ascending. Show results-ready polls first (from `result_views` where `viewed_at is null`).

## 9. Storage

- Bucket `poll-images` (private). Uploads go through a signed URL and are converted to WebP at 1080px max with EXIF stripped (removes GPS) by an Edge Function. Images are moderated before the poll can publish; clients read them through short-lived signed URLs.
- Bucket `share-cards` (private), generated on demand, expires after 7 days.

## 10. Retention

| Data | Kept |
|---|---|
| Polls, options, results, featured insights | Forever (creator history); `creator_id` nulled on deletion |
| Votes | Forever, voter nulled on deletion (aggregate stats) |
| Reasons raw `body` | 90 days after close, then deleted; `pii_redacted` kept only for featured ones |
| Poll images | Kept while the poll is in the creator's history; deleted 30 days after the poll is Removed/Deleted or the creator's account is deleted |
| Reports, moderation actions | 2 years (legal/DSA) |
| Notifications | 60 days |
| ai_jobs | 1 year |
| Consents | Until deletion + 1 year, anonymised |

## 11. Profile stats (computed)

- Polls voted = count(votes by user)
- Majority picks = share of `result_views.in_majority = true` (only polls with ≥ 10 votes)
- Featured insights = count(featured_insights joined to the user's votes, not removed)
- Top categories = the most frequent categories among the polls the user voted on
- Credits = `credit_balance`
Served by a `my_stats()` function; nothing per-vote is returned.

## 12. Migrations & seed

- Supabase migrations in `supabase/migrations/` (SQL, versioned).
- `seed.sql`: ~20 categories, 3–5 launch communities (incl. 1 pilot campus with its domain), admin user, 20 seed polls per launch community.
- Local dev: `supabase start`; test data with fake users across age ranges.

## 13. Open for Stage 4

- Edge Functions vs Postgres functions for each operation (AI and moderation calls must be Edge Functions; pure data logic can stay in Postgres).
- Push delivery (Expo push vs FCM/APNs directly) — Stage 5.
