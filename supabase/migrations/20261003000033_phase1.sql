-- Phase 1: notification budget, return path, daily question, decision journal, "need more info",
-- summary flags, coordinated-voting detection.

-- 1. Notification budget ------------------------------------------------------------------------
-- Nudges (anything the person didn't directly cause) are capped at 4 per rolling 7 days.
-- Results, moderation notices and answers to the person's own actions always go through.
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'decision_made' then n.poll_ended
      when 'summary_ready' then n.summary_ready when 'decision_reminder' then n.summary_ready
      when 'decision_checkin' then n.summary_ready
      when 'insight_featured' then n.insight_featured
      when 'new_polls_digest' then n.new_polls when 'follow_up' then n.new_polls when 'last_call' then n.new_polls
      when 'boosted_poll' then n.new_polls when 'reengage' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true)
    and (p_type not in ('new_polls_digest', 'follow_up', 'last_call', 'boosted_poll', 'reengage',
                        'decision_reminder', 'decision_checkin')
         or (select count(*) from public.notifications x
             where x.user_id = p_user and x.created_at > now() - interval '7 days'
               and x.type in ('new_polls_digest', 'follow_up', 'last_call', 'boosted_poll', 'reengage',
                              'decision_reminder', 'decision_checkin')) < 4);
$$;
revoke execute on function public.notify from public, anon, authenticated;

-- 2. Return path for lapsed users -------------------------------------------------------------
alter table public.profiles add column last_active_at timestamptz not null default now();

-- The app calls this when it comes to the foreground (at most hourly).
create or replace function public.touch_active()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '1 hour';
end $$;
revoke execute on function public.touch_active() from public, anon;
grant execute on function public.touch_active() to authenticated;

-- Day 3, 7 and 14 after someone was last active: one message each, then nothing.
create or replace function public.queue_reengagement()
returns void language plpgsql security definer set search_path = '' as $$
declare u record; step int; n int;
begin
  for u in
    select p.id, p.last_active_at from public.profiles p
    where p.status = 'active' and p.onboarding_step = 'complete'
      and p.last_active_at between now() - interval '15 days' and now() - interval '3 days'
  loop
    step := case when u.last_active_at <= now() - interval '14 days' then 14
                 when u.last_active_at <= now() - interval '7 days' then 7 else 3 end;
    continue when exists (select 1 from public.notifications x where x.user_id = u.id and x.type = 'reengage'
                          and x.created_at > u.last_active_at and (x.payload->>'step')::int >= step);
    if step = 7 then
      -- Only worth sending if a result is actually waiting.
      select count(*) into n from public.votes v join public.polls pl on pl.id = v.poll_id
      where v.voter_id = u.id and pl.status in ('completed', 'failed_ai')
        and not exists (select 1 from public.result_views r where r.poll_id = pl.id and r.user_id = u.id and r.viewed_at is not null);
      continue when n = 0;
    elsif step = 3 then
      select count(*) into n from public.get_feed_for(u.id, 50);
      continue when n = 0;
    else
      n := 0;
    end if;
    perform public.notify(u.id, 'reengage', null, jsonb_build_object('step', step, 'count', n));
  end loop;
end $$;

-- 3. Daily question -----------------------------------------------------------------------------
-- One shared poll a day, open to everyone for 24 hours. Admins write it ahead of time.
alter table public.polls add column daily_on date unique;

create or replace function public.admin_schedule_daily(p_day date, p_question text, p_labels text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin(); v_id uuid; n int := coalesce(array_length(p_labels, 1), 0);
begin
  if p_day < current_date then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if n < 2 or n > 4 or char_length(p_question) not between 5 and 120 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  delete from public.polls where daily_on = p_day and status = 'draft';
  insert into public.polls (creator_id, type, is_taste, question, duration_hours, moderation, daily_on)
  values (v_admin, 'expert', true, p_question, 24, 'approved', p_day)
  returning id into v_id;
  insert into public.poll_options (poll_id, side, label)
  select v_id, (array['a','b','c','d'])[i]::public.vote_side, p_labels[i] from generate_series(1, n) i;
  return v_id;
end $$;

create or replace function public.admin_daily_questions()
returns table (poll_id uuid, day date, question text, status public.poll_status, vote_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select p.id, p.daily_on, p.question, p.status, p.vote_count from public.polls p
  where p.daily_on >= current_date - 7 order by p.daily_on desc;
end $$;

revoke execute on function public.admin_schedule_daily(date, text, text[]), public.admin_daily_questions() from public, anon;
grant execute on function public.admin_schedule_daily(date, text, text[]), public.admin_daily_questions() to authenticated;

-- Goes live at midnight UTC for 24 hours.
create or replace function public.activate_daily()
returns void language sql security definer set search_path = '' as $$
  update public.polls set status = 'active', published_at = now(), closes_at = now() + interval '24 hours'
  where daily_on = current_date and status = 'draft';
$$;
revoke execute on function public.activate_daily() from public, anon, authenticated;

-- Today's question for the top of the feed (if not yet voted).
create or replace function public.get_daily()
returns table (id uuid, question text, closes_at timestamptz, options jsonb, voted boolean)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  return query
  select p.id, p.question, p.closes_at,
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path) order by o.side)
     from public.poll_options o where o.poll_id = p.id),
    exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
  from public.polls p
  where p.daily_on is not null and p.status = 'active' and p.closes_at > now() and p.creator_id is distinct from me.id
  order by p.daily_on desc limit 1;
end $$;
revoke execute on function public.get_daily() from public, anon;
grant execute on function public.get_daily() to authenticated;

-- 4. "Need more info" ---------------------------------------------------------------------------
-- Instead of voting, someone can say they need more context. It doesn't count as a vote. From 3
-- requests the asker is told once, so they can post a follow-up with details.
alter table public.polls add column info_notified boolean not null default false;

create table public.info_requests (
  poll_id    uuid not null references public.polls on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.info_requests enable row level security;
revoke all on public.info_requests from anon, authenticated;

create or replace function public.request_info(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; pl public.polls;
begin
  me := public.require_user();
  if not exists (select 1 from public.get_feed(1, null, null, p_poll)) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  insert into public.info_requests (poll_id, user_id) values (p_poll, me.id) on conflict do nothing;
  select * into pl from public.polls where id = p_poll for update;
  if not pl.info_notified and (select count(*) from public.info_requests where poll_id = p_poll) >= 3 then
    update public.polls set info_notified = true where id = p_poll;
    perform public.notify(pl.creator_id, 'info_requested', p_poll, jsonb_build_object('question', pl.question));
  end if;
end $$;
revoke execute on function public.request_info(uuid) from public, anon;
grant execute on function public.request_info(uuid) to authenticated;

create or replace function public.poll_info_requests(p_poll uuid)
returns int language sql stable security definer set search_path = '' as $$
  select case when n >= 3 then n else 0 end from (
    select count(*)::int n from public.info_requests i join public.polls p on p.id = i.poll_id
    where i.poll_id = p_poll and p.creator_id = auth.uid()) x;
$$;
revoke execute on function public.poll_info_requests(uuid) from public, anon;
grant execute on function public.poll_info_requests(uuid) to authenticated;

-- Feed: daily questions are shown separately; "need more info" hides the poll for that person.
drop function public.get_poll_for_vote(uuid);
drop function public.get_feed(int, timestamptz, uuid, uuid, int);

create or replace function public.get_feed_for(
  p_user uuid, p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = p_user;
  return query
  select p.id, p.type, p.is_taste, p.question, p.closes_at,
    case when p.daily_on is not null then 'Today’s question'
      when p.friends_only then 'Friends'
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
    and (p_only is not null or p.daily_on is null)
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.info_requests i where i.poll_id = p.id and i.user_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
    and (
      p.daily_on is not null
      or exists (select 1 from public.poll_invitees i where i.poll_id = p.id and i.user_id = me.id)
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
revoke execute on function public.get_feed_for(uuid, int, timestamptz, uuid, uuid, int) from public, anon, authenticated;

create or replace function public.get_feed(
  p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  return query select * from public.get_feed_for(me.id, p_limit, p_after_closes, p_after_id, p_only, p_after_bucket);
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

-- Voting: the daily question is open to everyone.
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
  v_audience := pl.daily_on is not null or (not pl.friends_only and exists (
    select 1 from public.audience_ids(pl.creator_id, pl.type, cats, pl.age_min, pl.age_max, pl.community_id) a
    where a = p_user));
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

-- 5. Decision journal and 30-day check-in -------------------------------------------------------
alter table public.polls add column checkin_glad boolean, add column checkin_at timestamptz,
  add column checkin_sent boolean not null default false;

create or replace function public.my_journal()
returns table (poll_id uuid, question text, closed_at timestamptz, total_votes int, winner text, winner_pct numeric,
               chose text, decision_none boolean, decision_helpful boolean, decided_at timestamptz,
               followed_crowd boolean, checkin_glad boolean, checkin_due boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.closes_at, r.total_votes,
    (select o.label from public.poll_options o where o.poll_id = p.id and o.side = r.winner),
    (r.pcts->>r.winner::text)::numeric,
    (select o.label from public.poll_options o where o.poll_id = p.id and o.side = p.decision_side),
    p.decision_none, p.decision_helpful, p.decided_at,
    case when p.decision_side is null or r.winner is null then null else p.decision_side = r.winner end,
    p.checkin_glad,
    p.decided_at is not null and not coalesce(p.decision_none, false) and p.checkin_at is null
      and p.decided_at < now() - interval '30 days'
  from public.polls p left join public.poll_results r on r.poll_id = p.id
  where p.creator_id = auth.uid() and p.status in ('completed', 'failed_ai') and p.daily_on is null
  order by p.closes_at desc limit 200;
end $$;

create or replace function public.save_checkin(p_poll uuid, p_glad boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  update public.polls set checkin_glad = p_glad, checkin_at = now()
  where id = p_poll and creator_id = auth.uid() and decided_at is not null and checkin_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
end $$;

revoke execute on function public.my_journal(), public.save_checkin(uuid, boolean) from public, anon;
grant execute on function public.my_journal(), public.save_checkin(uuid, boolean) to authenticated;

create or replace function public.queue_decision_checkins()
returns void language plpgsql security definer set search_path = '' as $$
declare pl record;
begin
  for pl in
    select * from public.polls
    where decided_at < now() - interval '30 days' and decided_at > now() - interval '45 days'
      and not coalesce(decision_none, false) and checkin_at is null and not checkin_sent
    for update skip locked
  loop
    perform public.notify(pl.creator_id, 'decision_checkin', pl.id, jsonb_build_object('question', pl.question));
    update public.polls set checkin_sent = true where id = pl.id;
  end loop;
end $$;

-- 6. "This summary is off" flags ----------------------------------------------------------------
create table public.summary_flags (
  poll_id    uuid not null references public.polls on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.summary_flags enable row level security;
revoke all on public.summary_flags from anon, authenticated;

create or replace function public.flag_summary(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  if not exists (select 1 from public.poll_results where poll_id = p_poll and summary_majority is not null)
     or not (exists (select 1 from public.votes where poll_id = p_poll and voter_id = me.id)
             or exists (select 1 from public.polls where id = p_poll and creator_id = me.id)) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  insert into public.summary_flags (poll_id, user_id) values (p_poll, me.id) on conflict do nothing;
end $$;
revoke execute on function public.flag_summary(uuid) from public, anon;
grant execute on function public.flag_summary(uuid) to authenticated;

create or replace function public.admin_flagged_summaries()
returns table (poll_id uuid, question text, flags int, total_votes int, summary_majority text, summary_minority text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.question, count(f.*)::int, r.total_votes, r.summary_majority, r.summary_minority
  from public.summary_flags f join public.polls p on p.id = f.poll_id join public.poll_results r on r.poll_id = p.id
  group by p.id, p.question, r.total_votes, r.summary_majority, r.summary_minority
  order by count(f.*) desc, p.id limit 100;
end $$;
revoke execute on function public.admin_flagged_summaries() from public, anon;
grant execute on function public.admin_flagged_summaries() to authenticated;

-- 7. Coordinated-voting detection ---------------------------------------------------------------
-- 8+ votes for the same option within 10 minutes, all from accounts under 7 days old, get flagged
-- for an admin to look at. Nothing is removed automatically.
create table public.integrity_flags (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references public.polls on delete cascade,
  side         public.vote_side not null,
  votes        int not null,
  window_start timestamptz not null,
  reviewed     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (poll_id, side, window_start)
);
alter table public.integrity_flags enable row level security;
revoke all on public.integrity_flags from anon, authenticated;

create or replace function public.detect_vote_bursts()
returns void language sql security definer set search_path = '' as $$
  insert into public.integrity_flags (poll_id, side, votes, window_start)
  select v.poll_id, v.side, count(*), date_bin('10 minutes', v.created_at, timestamptz '2026-01-01')
  from public.votes v join public.profiles p on p.id = v.voter_id
  where v.created_at > now() - interval '2 hours' and p.created_at > v.created_at - interval '7 days'
  group by v.poll_id, v.side, date_bin('10 minutes', v.created_at, timestamptz '2026-01-01')
  having count(*) >= 8
  on conflict (poll_id, side, window_start) do update set votes = excluded.votes;
$$;
revoke execute on function public.detect_vote_bursts() from public, anon, authenticated;

create or replace function public.admin_integrity_flags()
returns table (id uuid, poll_id uuid, question text, side public.vote_side, votes int, window_start timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select f.id, f.poll_id, p.question, f.side, f.votes, f.window_start
  from public.integrity_flags f join public.polls p on p.id = f.poll_id
  where not f.reviewed order by f.created_at desc limit 100;
end $$;

create or replace function public.admin_review_integrity_flag(p_flag uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.integrity_flags set reviewed = true where id = p_flag;
end $$;
revoke execute on function public.admin_integrity_flags(), public.admin_review_integrity_flag(uuid) from public, anon;
grant execute on function public.admin_integrity_flags(), public.admin_review_integrity_flag(uuid) to authenticated;

-- Admin nav counts include the new queues.
create or replace function public.admin_queue_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'reports', (select count(*) from public.reports where status = 'open'),
    'appeals', (select count(*) from public.appeals where status = 'open'),
    'ai', (select count(*) from public.polls where status = 'failed_ai'),
    'integrity', (select count(*) from public.integrity_flags where not reviewed));
end $$;

-- Schedules.
select cron.schedule('activate-daily', '1 0 * * *', 'select public.activate_daily()');
select cron.schedule('reengagement', '0 17 * * *', 'select public.queue_reengagement()');
select cron.schedule('decision-checkins', '30 17 * * *', 'select public.queue_decision_checkins()');
select cron.schedule('vote-bursts', '*/30 * * * *', 'select public.detect_vote_bursts()');
revoke execute on function public.queue_reengagement(), public.queue_decision_checkins() from public, anon, authenticated;
