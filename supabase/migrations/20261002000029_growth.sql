-- Growth: friend vote links, friends-only polls, campus unlock progress, referral codes.

-- 1. Friend links ------------------------------------------------------------------------------
-- Anyone signed in who opens a poll's link may vote on it, even outside the targeted audience.
-- Their votes are flagged so the creator can see how many came from links.
alter table public.polls add column invite_code text unique, add column friends_only boolean not null default false;
alter table public.votes add column via_invite boolean not null default false;

create table public.poll_invitees (
  poll_id    uuid not null references public.polls on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index on public.poll_invitees (user_id);
alter table public.poll_invitees enable row level security;
revoke all on public.poll_invitees from anon, authenticated;

-- 10-character URL-safe code.
create or replace function public.new_code() returns text language sql volatile set search_path = '' as $$
  select substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=', 'xyz'), 1, 10);
$$;
revoke execute on function public.new_code() from public, anon, authenticated;

-- Creator gets (or creates) the share code for a live poll.
create or replace function public.poll_invite_code(p_poll uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_user();
  update public.polls set invite_code = coalesce(invite_code, public.new_code())
  where id = p_poll and creator_id = auth.uid() and status = 'active'
  returning invite_code into v;
  if v is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  return v;
end $$;

-- Public link preview (web page and app): only live, approved polls; no counts, no creator.
create or replace function public.get_invite_preview(p_code text)
returns table (question text, closes_at timestamptz, options jsonb)
language sql stable security definer set search_path = '' as $$
  select p.question, p.closes_at,
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label) order by o.side)
     from public.poll_options o where o.poll_id = p.id)
  from public.polls p
  where p.invite_code = p_code and p.status = 'active' and p.moderation = 'approved' and p.closes_at > now();
$$;

-- Opening a link adds the caller as an invitee and returns the poll id to vote on.
create or replace function public.claim_poll_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me public.profiles; pl public.polls;
begin
  me := public.require_user();
  perform public.hit_rate_limit(me.id, 'invite_claim', 30, interval '1 hour');
  select * into pl from public.polls
  where invite_code = p_code and status = 'active' and moderation = 'approved' and closes_at > now();
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.creator_id = me.id then raise exception 'CANNOT_VOTE_OWN_POLL' using errcode = 'P0001'; end if;
  if exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = pl.creator_id) then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if (select count(*) from public.poll_invitees where poll_id = pl.id) >= 500 then
    raise exception 'INVITE_LIMIT' using errcode = 'P0001';
  end if;
  insert into public.poll_invitees (poll_id, user_id) values (pl.id, me.id) on conflict do nothing;
  return pl.id;
end $$;

-- Link votes for the creator. Shown only from 3, so a single friend can't be singled out.
create or replace function public.poll_invite_stats(p_poll uuid)
returns table (invite_code text, friends_only boolean, link_votes int)
language plpgsql stable security definer set search_path = '' as $$
declare n int;
begin
  perform public.require_user();
  select count(*) into n from public.votes v join public.polls p on p.id = v.poll_id
  where v.poll_id = p_poll and p.creator_id = auth.uid() and v.via_invite;
  return query select p.invite_code, p.friends_only, case when n >= 3 then n else 0 end
  from public.polls p where p.id = p_poll and p.creator_id = auth.uid();
end $$;

revoke execute on function public.poll_invite_code(uuid), public.claim_poll_invite(text),
  public.poll_invite_stats(uuid) from public, anon;
grant execute on function public.poll_invite_code(uuid), public.claim_poll_invite(text),
  public.poll_invite_stats(uuid) to authenticated;
revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- Feed: invitees see the poll; friends-only polls are visible to invitees only.
drop function public.get_poll_for_vote(uuid);
drop function public.get_feed(int, timestamptz, uuid, uuid, int);

create or replace function public.get_feed(
  p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  return query
  select p.id, p.type, p.is_taste, p.question, p.closes_at,
    case when p.friends_only then 'Friends'
      when p.type = 'community' then (select c.name from public.communities c where c.id = p.community_id)
      else (select string_agg(c.name, ' · ' order by c.sort) from public.poll_target_categories t
            join public.categories c on c.id = t.category_id where t.poll_id = p.id) end,
    exists (select 1 from public.poll_target_categories t join public.categories c on c.id = t.category_id
            where t.poll_id = p.id and c.is_sensitive),
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path) order by o.side)
     from public.poll_options o where o.poll_id = p.id),
    (p.vote_count >= 10)::int,
    (select pp.question from public.polls pp where pp.id = p.parent_poll_id)
  from public.polls p
  where p.status = 'active' and p.moderation = 'approved' and p.closes_at > now()
    and p.creator_id is distinct from me.id
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
    and (
      exists (select 1 from public.poll_invitees i where i.poll_id = p.id and i.user_id = me.id)
      or (not p.friends_only and case p.type
        when 'expert' then
          exists (select 1 from public.poll_target_categories t join public.user_categories uc
                  on uc.category_id = t.category_id where t.poll_id = p.id and uc.user_id = me.id)
          and (p.age_min is null or extract(year from now())::int - me.birth_year between p.age_min and p.age_max)
        else exists (select 1 from public.user_communities m where m.user_id = me.id and m.community_id = p.community_id)
      end))
    and (p_after_closes is null
         or ((p.vote_count >= 10)::int, p.closes_at, p.id) > (coalesce(p_after_bucket, 0), p_after_closes, p_after_id))
    and (p_only is null or p.id = p_only)
  order by (p.vote_count >= 10)::int, p.closes_at, p.id
  limit least(p_limit, 50);
end $$;
revoke execute on function public.get_feed(int, timestamptz, uuid, uuid, int) from public, anon;
grant execute on function public.get_feed(int, timestamptz, uuid, uuid, int) to authenticated;

create or replace function public.get_poll_for_vote(p_poll uuid)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language sql stable security definer set search_path = '' as $$
  select * from public.get_feed(1, null, null, p_poll);
$$;
revoke execute on function public.get_poll_for_vote(uuid) from public, anon;
grant execute on function public.get_poll_for_vote(uuid) to authenticated;

-- Voting: invitees are eligible; their votes are flagged.
create or replace function public.cast_vote_internal(
  p_user uuid, p_poll uuid, p_side public.vote_side, p_reason text, p_predicted public.vote_side,
  p_consent boolean, p_reason_moderation public.moderation_state, p_flags jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  pl public.polls;
  prof public.profiles;
  cats smallint[];
  v_vote uuid;
  v_invited boolean;
  v_audience boolean;
  reason_text text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into prof from public.profiles where id = p_user;
  if prof.status <> 'active' then raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001'; end if;
  if prof.onboarding_step <> 'complete' then raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001'; end if;
  perform public.hit_rate_limit(p_user, 'vote', 60, interval '1 hour');

  select * into pl from public.polls where id = p_poll for update;
  if pl.id is null or pl.status in ('removed','deleted','draft') then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if pl.status <> 'active' or pl.closes_at <= now() then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if pl.creator_id = p_user then raise exception 'CANNOT_VOTE_OWN_POLL' using errcode = 'P0001'; end if;
  select coalesce(array_agg(category_id), '{}') into cats from public.poll_target_categories where poll_id = p_poll;
  v_invited := exists (select 1 from public.poll_invitees where poll_id = p_poll and user_id = p_user);
  v_audience := not pl.friends_only and exists (
    select 1 from public.audience_ids(pl.creator_id, pl.type, cats, pl.age_min, pl.age_max, pl.community_id) a
    where a = p_user);
  if not (v_invited or v_audience) then raise exception 'NOT_ELIGIBLE' using errcode = 'P0001'; end if;
  if not p_consent then raise exception 'CONSENT_REQUIRED' using errcode = 'P0001'; end if;
  if pl.type = 'expert' and not pl.is_taste and coalesce(char_length(reason_text), 0) < 20 then
    raise exception 'REASON_TOO_SHORT' using errcode = 'P0001';
  end if;
  if char_length(reason_text) > 200 then raise exception 'REASON_TOO_LONG' using errcode = 'P0001'; end if;
  if reason_text is not null and p_reason_moderation = 'rejected' then
    raise exception 'REASON_REJECTED' using errcode = 'P0001';
  end if;

  insert into public.votes (poll_id, voter_id, side, predicted_side, feature_consent, via_invite)
  values (p_poll, p_user, p_side, p_predicted, p_consent, not v_audience)
  on conflict (poll_id, voter_id) do nothing
  returning id into v_vote;
  if v_vote is null then raise exception 'ALREADY_VOTED' using errcode = 'P0001'; end if;

  if reason_text is not null then
    insert into public.reasons (vote_id, body, moderation, moderation_flags)
    values (v_vote, reason_text, p_reason_moderation, p_flags);
  end if;

  update public.polls set vote_count = vote_count + 1 where id = p_poll;
  -- Vote credits count only once the account is 24h old (STAGE2 §11).
  insert into public.credit_ledger (user_id, delta, reason, poll_id, vote_id, available_at)
  values (p_user, 1, 'vote', p_poll, v_vote, greatest(now(), prof.created_at + interval '24 hours'));
  return pl.closes_at;
end $$;
revoke execute on function public.cast_vote_internal from public, anon, authenticated;

-- 2. Campus unlock progress --------------------------------------------------------------------
-- A campus community with a launch target takes no public polls until that many members have joined.
alter table public.communities add column launch_target int check (launch_target is null or launch_target > 0);

create or replace function public.community_locked(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(c.launch_target > (select count(*) from public.user_communities m where m.community_id = c.id), false)
  from public.communities c where c.id = p_community;
$$;
revoke execute on function public.community_locked(uuid) from public, anon, authenticated;

create or replace function public.community_progress()
returns table (community_id uuid, members int, launch_target int)
language sql stable security definer set search_path = '' as $$
  select c.id, (select count(*)::int from public.user_communities m where m.community_id = c.id), c.launch_target
  from public.communities c where c.launch_target is not null and not c.archived;
$$;
revoke execute on function public.community_progress() from public, anon;
grant execute on function public.community_progress() to authenticated;

create or replace function public.admin_set_launch_target(p_community uuid, p_target int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.communities set launch_target = p_target where id = p_community;
end $$;
revoke execute on function public.admin_set_launch_target(uuid, int) from public, anon;
grant execute on function public.admin_set_launch_target(uuid, int) to authenticated;

-- 3. Friends-only publishing: skips the 20-person minimum; the poll is reachable only by its link.
drop function public.publish_poll_internal(uuid, uuid);
create or replace function public.publish_poll_internal(p_user uuid, p_poll uuid, p_friends_only boolean default false)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  pl public.polls;
  aud int;
  cats smallint[];
begin
  select * into pl from public.polls where id = p_poll and creator_id = p_user for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status <> 'draft' then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if pl.moderation <> 'approved' then raise exception 'CONTENT_REJECTED' using errcode = 'P0001'; end if;
  if exists (select 1 from public.poll_options where poll_id = p_poll
             and image_path is not null and image_moderation is distinct from 'approved') then
    raise exception 'IMAGE_PENDING' using errcode = 'P0001';
  end if;
  if not p_friends_only and pl.community_id is not null and public.community_locked(pl.community_id) then
    raise exception 'COMMUNITY_LOCKED' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(category_id), '{}') into cats from public.poll_target_categories where poll_id = p_poll;
  select count(*) into aud from public.audience_ids(p_user, pl.type, cats, pl.age_min, pl.age_max, pl.community_id);
  if aud < 20 and not p_friends_only then raise exception 'AUDIENCE_TOO_SMALL' using errcode = 'P0001'; end if;
  if public.credit_units(p_user) < 3 then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;
  insert into public.credit_ledger (user_id, delta, reason, poll_id) values (p_user, -3, 'poll_publish', p_poll);
  update public.polls set status = 'active', published_at = now(),
    closes_at = now() + make_interval(hours => duration_hours),
    estimated_audience = case when p_friends_only then 0 else aud end,
    friends_only = p_friends_only,
    invite_code = case when p_friends_only then public.new_code() else invite_code end
  where id = p_poll;
  return now() + make_interval(hours => pl.duration_hours);
end $$;
revoke execute on function public.publish_poll_internal(uuid, uuid, boolean) from public, anon, authenticated;

-- 4. Referral codes ----------------------------------------------------------------------------
-- A new account can enter a friend's code within 7 days of signing up. Once it has cast 3 votes,
-- both get one poll's worth of credit. A referrer earns for at most 20 friends.
alter table public.profiles add column referral_code text unique;

create table public.referrals (
  referee_id  uuid primary key references public.profiles on delete cascade,
  referrer_id uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  credited_at timestamptz
);
create index on public.referrals (referrer_id);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

create or replace function public.my_referral()
returns table (code text, joined int, credited int)
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_user();
  update public.profiles set referral_code = coalesce(referral_code, public.new_code())
  where id = auth.uid() returning referral_code into v;
  return query select v,
    (select count(*)::int from public.referrals where referrer_id = auth.uid()),
    (select count(*)::int from public.referrals where referrer_id = auth.uid() and credited_at is not null);
end $$;

create or replace function public.redeem_referral(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; v_ref uuid;
begin
  me := public.require_user(false);
  perform public.hit_rate_limit(me.id, 'referral', 10, interval '1 day');
  if me.created_at < now() - interval '7 days' then raise exception 'REFERRAL_EXPIRED' using errcode = 'P0001'; end if;
  select id into v_ref from public.profiles where referral_code = p_code and status = 'active';
  if v_ref is null or v_ref = me.id then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  insert into public.referrals (referee_id, referrer_id) values (me.id, v_ref) on conflict do nothing;
  if not found then raise exception 'ALREADY_REFERRED' using errcode = 'P0001'; end if;
end $$;

revoke execute on function public.my_referral(), public.redeem_referral(text) from public, anon;
grant execute on function public.my_referral(), public.redeem_referral(text) to authenticated;

create or replace function public.credit_referral() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.referrals;
begin
  select * into r from public.referrals where referee_id = new.voter_id and credited_at is null for update;
  if r.referee_id is null or (select count(*) from public.votes where voter_id = new.voter_id) < 3 then
    return new;
  end if;
  update public.referrals set credited_at = now() where referee_id = r.referee_id;
  insert into public.credit_ledger (user_id, delta, reason) values (r.referee_id, 3, 'referral');
  if (select count(*) from public.referrals where referrer_id = r.referrer_id and credited_at is not null) <= 20 then
    insert into public.credit_ledger (user_id, delta, reason) values (r.referrer_id, 3, 'referral');
    perform public.notify(r.referrer_id, 'referral_credited', null, '{}'::jsonb);
  end if;
  return new;
end $$;
revoke execute on function public.credit_referral() from public, anon, authenticated;
create trigger on_vote_credit_referral after insert on public.votes
  for each row when (new.voter_id is not null) execute function public.credit_referral();
