# Opinion — Stage 4: API Architecture

Backend: Supabase. Builds on [Stage 3](STAGE3_DATABASE.md). Clients: mobile app (iOS/Android) and admin web.

## 1. Layers

```
Mobile app ──► Supabase client SDK
                ├─ PostgREST: read-only views (RLS)          → feed, my polls, results, profile
                ├─ RPC: Postgres functions (SECURITY DEFINER) → fast data actions
                ├─ Edge Functions (Deno)                      → anything calling outside services
                ├─ Storage (signed URLs)                      → poll images, share cards
                └─ Realtime (one channel)                     → creator's live vote count
Background:  pg_cron → close_due_polls() → pgmq queue → Edge workers (moderation, AI, push)
External:    OpenAI (moderation + summaries) · Expo Push / APNs / FCM · Apple/Google age signals
```

Rule: **Postgres functions** for logic that only touches data (atomic, fast, no network). **Edge Functions** for anything calling OpenAI, push services, Apple/Google, or image processing. Clients never write to tables directly.

## 2. Conventions

- Auth: Supabase JWT in `Authorization: Bearer`. Every function first checks `profiles.status = 'active'` and `onboarding_step = 'complete'` (except the onboarding functions).
- Edge Functions also require an App Attest / Play Integrity token header `X-Integrity` on `sign-up`, `cast_vote`, `publish_poll`.
- Errors: `{ "error": { "code": "POLL_CLOSED", "message": "This poll just closed" } }` with HTTP 4xx. Codes listed in §8.
- Idempotency: write calls take an `Idempotency-Key` (UUID from the client) so retries on bad networks don't double vote or double charge.
- Pagination: cursor based (`after` = last `closes_at,id`), page size 20.
- Versioning: Edge Functions under `/v1/`; RPC functions suffixed `_v1` when breaking.
- Times returned in UTC ISO 8601; the client shows local time.

## 3. Endpoints

### 3.1 Auth & onboarding

| Call | Type | Input → Output | Notes |
|---|---|---|---|
| Sign in (Apple/Google/email code) | Supabase Auth | provider token / email → session | Built-in |
| `v1/onboarding/age` | Edge | `{birth_year, store_signal?}` → `{ok}` / `AGE_BLOCKED` | Verifies the store age signal server-side when present; under 18 → deletes the auth user |
| `accept_terms(version)` | RPC | → `{ok}` | Writes `consents` |
| `set_categories(ids[])` | RPC | 1–5 ids → `{ok}` / `CATEGORY_LIMIT`, `CATEGORY_COOLDOWN` | 7-day limit after onboarding |
| `join_community(id)` / `leave_community(id)` | RPC | → `{ok}` / `CAMPUS_VERIFICATION_REQUIRED` | |
| `v1/campus/send-code` | Edge | `{email, community_id}` → `{ok}` | Checks domain allowlist; sends code; 5/hour |
| `v1/campus/verify` | Edge | `{email, code}` → `{ok}` / `EMAIL_ALREADY_USED` | Stores hash only |
| `complete_onboarding()` | RPC | → `{ok}` | Validates all steps done |
| `register_device(token, platform)` | RPC | → `{ok}` | |

### 3.2 Feed & voting

| Call | Type | Input → Output |
|---|---|---|
| `GET feed_polls` | View | `?after&limit` → `[{id, type, is_taste, question, options[{side,label,image_url}], target_label, closes_at}]` — no creator, no counts |
| `GET results_ready` | View | → polls with an unviewed result |
| `GET waiting_polls` | View | → polls I voted on that are still open (`{id, question, my_side, closes_at}`) |
| `v1/votes` (POST) | Edge | `{poll_id, side, reason?, predicted_side?, feature_consent}` → `{credits_progress, closes_at}` |
| `get_result(poll_id)` | RPC | → result payload (§4) / `ALREADY_VIEWED` with `{in_majority, predicted_correctly}` |
| `mark_result_viewed(poll_id)` | RPC | → `{ok}` (client calls on close or after 10s; server also auto-marks 10s after `first_opened_at` via cron) |

`v1/votes` flow:
1. Validate the integrity token.
2. Call `cast_vote` (RPC, in one transaction): checks eligibility, status, not the creator, not already voted, and reason length; inserts the vote and reason; adds a credit; updates the vote count.
3. Run moderation synchronously (OpenAI omni-moderation, ~300ms) **before** returning. If rejected, roll back and return `REASON_REJECTED` (F-02r).
4. Queue the PII/injection screen for later (async).

### 3.3 Create

| Call | Type | Input → Output |
|---|---|---|
| `v1/polls/draft` (POST) | Edge | `{type, is_taste, question, options[], targeting, duration_hours}` → `{poll_id}`; moderates text immediately |
| `v1/polls/{id}/image` (POST) | Edge | `{side}` → signed upload URL; then a storage trigger converts and moderates the image |
| `estimate_audience(targeting)` | RPC | → `{estimate}` rounded to the nearest 10; `<20` → `"fewer than 20"` (debounced from the UI) |
| `v1/polls/{id}/publish` (POST) | Edge | → `{closes_at}` / `AUDIENCE_TOO_SMALL`, `INSUFFICIENT_CREDITS`, `CONTENT_REJECTED`, `IMAGE_PENDING` |
| `delete_poll(id)` | RPC | → `{refunded: true}` / `POLL_HAS_VOTES` |

### 3.4 My polls, profile, share

| Call | Type | Output |
|---|---|---|
| `GET my_polls` | View | `?status=active|completed` → list with `vote_count` |
| Realtime `poll:{id}:count` | Realtime | Live vote count; creator only (RLS on broadcast) |
| `get_my_poll_result(id)` | RPC | Result payload (§4) without the "view once" rule |
| `v1/polls/{id}/share-card` (POST) | Edge | → signed PNG URL (1080×1350), rendered with Satori/resvg |
| `my_stats()` | RPC | `{polls_voted, majority_pct, featured_count, top_categories[], credits, polls_available}` |
| `my_featured_insights()` | RPC | `[{quote, poll_question, featured_at}]` |

### 3.5 Safety, settings, account

| Call | Type | Notes |
|---|---|---|
| `submit_report(target_type, target_id, reason, note?)` | RPC | Severity from reason; `self_harm` → response includes support links |
| `hide_creator(poll_id)` / `unhide_creator(hidden_id)` / `GET hidden_creators` | RPC / View | Creator id never returned; list shows the poll question only |
| `update_notification_prefs(...)` | RPC | |
| `v1/account` (DELETE) | Edge | Runs the deletion transaction + Apple token revoke + storage cleanup |
| `v1/data-export` (POST) | Edge | GDPR export: emailed link to a JSON file within 30 days (manual at first) |

### 3.6 Admin (web, `is_admin` + 2FA)

`admin_queue(filters)`, `admin_item(report_id)`, `admin_act(report_id, action, rule, note)`, `admin_user(handle|email)`, `admin_suspend/unsuspend(user)`, `admin_upsert_community/category`, `admin_seed_poll(...)`, `admin_retry_ai(poll_id)`, `admin_metrics(range)`. All write a `moderation_actions` row. Admin is a separate web app using the same Supabase project, only through these RPCs.

## 4. Result payload

```json
{
  "poll_id": "…",
  "question": "MacBook Air or ThinkPad X1 for CS degree?",
  "state": "ready | not_enough_responses | summary_pending",
  "total_votes": 37,
  "options": [{"side":"a","label":"MacBook Air","pct":62.2},{"side":"b","label":"ThinkPad X1","pct":37.8}],
  "winner": "a",
  "you": {"side":"a","in_majority":true,"predicted_correctly":true},
  "prediction": {"a_pct": 55.0},
  "summary": {
    "majority": "Most voters cited battery life and resale value…",
    "minority": "Those choosing the ThinkPad pointed to Linux support…",
    "label": "AI-generated from voters' reasons. May be inaccurate.",
    "disclaimer": null
  },
  "featured": [{"id":"…","quote":"…","side":"a"}],
  "view_once": true
}
```
`disclaimer` is filled for sensitive categories ("Not professional medical advice"). `minority` is null below the threshold, and the UI says "A minority disagreed". `you` is omitted for the creator.

## 5. Background pipeline

```
pg_cron (every minute) → close_due_polls()
   active & closes_at ≤ now → closing
   compute poll_results (counts in SQL)
   create result_views for all voters
   < 10 votes → completed (state not_enough_responses) → enqueue push "poll_ended"
   ≥ 10 votes → summarizing → enqueue ai_summary job

Worker: ai-summary (Edge, triggered by pgmq)
   1. load approved reasons (pii_redacted), group by side, wrap each as <reason id="r12">…</reason>
   2. call model (structured JSON output, no tools): majority summary, minority summary (if ≥5),
      clusters, candidate featured ids, each claim with cited reason ids
   3. validate: cited ids exist, featured quotes exactly match stored text,
      ≥1 minority quote when eligible, consent = true, length limits
   4. second check call: "does the summary leave out any view in these clusters? is it fair?"
      → one revision if it fails
   5. write poll_results.summary_*, featured_insights → completed
   6. enqueue pushes: poll_ended (voters), summary_ready (creator), insight_featured (authors)
   errors → retry ×3 with backoff (1, 5, 15 min) → failed_ai (results shown, admin retry)

Worker: moderation-async — PII redaction + injection classifier for reasons; image moderation
Worker: push — sends via Expo Push; drops invalid tokens
Cron 18:00 per time zone: new-polls digest ("6 new polls in Tech and Career")
Cron daily: retention deletes (Stage 3 §10), campus verification expiry
```

## 6. AI configuration

| Item | Choice |
|---|---|
| Summaries | Claude Sonnet 5.5 (`claude-sonnet-5-5`) with structured outputs; fallback to Claude Haiku 4.5 on errors. Confirmed in Stage 5 |
| Moderation | OpenAI `omni-moderation-latest` (free) for text and images |
| PII / injection screen | Claude Haiku 4.5 classifier + regex (emails, phones, URLs, @handles) |
| Prompts | Versioned files in the repo; `summary_version` stored with each result |
| Cost estimate | ~200 reasons × 50 tokens ≈ 10k in / 800 out per poll ≈ $0.04 per poll |
| Data | Zero data retention requested from vendors; no user ids sent, only reason ids |

## 7. Rate limits

| Action | Limit |
|---|---|
| Votes | 60 / hour / user |
| Drafts | 10 / day; publishes limited by credits |
| Reports | 20 / day |
| Audience estimate | 30 / minute |
| Campus codes | 5 / hour / email |
| Share cards | 10 / day |
Enforced in a `rate_limits` table (Postgres) keyed by user + action + window.

## 8. Error codes

`UNAUTHENTICATED`, `ACCOUNT_SUSPENDED`, `ONBOARDING_INCOMPLETE`, `AGE_BLOCKED`, `INTEGRITY_FAILED`, `RATE_LIMITED`, `CATEGORY_LIMIT`, `CATEGORY_COOLDOWN`, `CAMPUS_VERIFICATION_REQUIRED`, `EMAIL_ALREADY_USED`, `CODE_INVALID`, `POLL_NOT_FOUND`, `POLL_CLOSED`, `NOT_ELIGIBLE`, `ALREADY_VOTED`, `CANNOT_VOTE_OWN_POLL`, `REASON_TOO_SHORT`, `REASON_TOO_LONG`, `REASON_REJECTED`, `CONSENT_REQUIRED`, `CONTENT_REJECTED`, `IMAGE_PENDING`, `AUDIENCE_TOO_SMALL`, `INSUFFICIENT_CREDITS`, `POLL_HAS_VOTES`, `ALREADY_VIEWED`, `RESULT_NOT_READY`, `INTERNAL`.

## 9. Security checklist

- RLS default deny; automated test that every table has RLS enabled and the anon role can read nothing but public categories/communities.
- `SECURITY DEFINER` functions set `search_path`, check `auth.uid()` first.
- Service role key only in Edge Functions, never in clients.
- Feed views never include `creator_id`, vote timestamps or per-voter data.
- Logs: no reason text, emails or birth years in logs.
- Secrets in Supabase Vault / function secrets.
- Admin: separate domain, 2FA, IP allowlist optional, every action audited.

## 10. Observability

- Sentry in the app and Edge Functions; PostHog for product analytics (events from Stage 2 plus `vote_cast`, `poll_published`, `result_viewed`, `report_submitted`).
- Alerts: AI job failure rate > 5%, moderation queue oldest item > 12h, closer cron lag > 3 min.

## 11. Testing

- Postgres: pgTAP tests for every RPC and RLS rule (especially "a voter can't see others' votes", "creator can't see reasons").
- Edge: Deno tests with mocked OpenAI/Claude.
- AI: an evaluation set of 30 poll fixtures (incl. injection attempts, tiny minorities, PII) checked for minority coverage, citation validity and exact quotes before any prompt change.
