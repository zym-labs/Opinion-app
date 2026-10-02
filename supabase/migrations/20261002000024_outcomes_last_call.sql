-- Decision outcomes, last-call nudges and weekly streaks (post-MVP).

-- 1. Decision outcomes: the asker says what they chose (null side = none of these) and whether it helped.
alter table public.polls
  add column decision_side public.vote_side,
  add column decision_none boolean not null default false,
  add column decision_helpful boolean,
  add column decided_at timestamptz,
  add column last_call_sent boolean not null default false;

create or replace function public.record_decision(p_poll uuid, p_side public.vote_side, p_helpful boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pl public.polls;
  chose text;
begin
  perform public.require_user();
  select * into pl from public.polls where id = p_poll and creator_id = auth.uid() for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status not in ('completed','failed_ai') then raise exception 'RESULT_NOT_READY' using errcode = 'P0001'; end if;
  if pl.decided_at is not null then raise exception 'ALREADY_DECIDED' using errcode = 'P0001'; end if;
  if pl.closes_at < now() - interval '30 days' then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if p_side is not null and not exists (select 1 from public.poll_options where poll_id = p_poll and side = p_side) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  update public.polls set decision_side = p_side, decision_none = (p_side is null),
    decision_helpful = p_helpful, decided_at = now()
  where id = p_poll;

  chose := coalesce((select coalesce(label, 'Option ' || upper(side::text)) from public.poll_options
                     where poll_id = p_poll and side = p_side), 'none of the options');
  -- Voters learn the outcome; nobody learns who asked or who voted.
  perform public.notify(v.voter_id, 'decision_made', p_poll,
    jsonb_build_object('question', pl.question, 'chose', chose, 'matched', v.side = p_side))
  from public.votes v where v.poll_id = p_poll and v.voter_id is not null;
end $$;
revoke execute on function public.record_decision(uuid, public.vote_side, boolean) from public, anon;
grant execute on function public.record_decision(uuid, public.vote_side, boolean) to authenticated;

-- Remind askers 2 days after a result if they haven't said what they chose (once per poll).
create or replace function public.queue_decision_reminders()
returns void language sql security definer set search_path = '' as $$
  select public.notify(p.creator_id, 'decision_reminder', p.id, jsonb_build_object('question', p.question))
  from public.polls p
  where p.status in ('completed','failed_ai') and p.decided_at is null and p.creator_id is not null
    and p.closes_at between now() - interval '3 days' and now() - interval '2 days'
    and not exists (select 1 from public.notifications n where n.poll_id = p.id and n.type = 'decision_reminder');
$$;
revoke execute on function public.queue_decision_reminders() from public, anon, authenticated;
select cron.schedule('decision-reminders', '20 * * * *', 'select public.queue_decision_reminders()');

-- Notification preferences: outcomes follow "poll ended", nudges follow "new polls".
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'decision_made' then n.poll_ended
      when 'summary_ready' then n.summary_ready when 'decision_reminder' then n.summary_ready
      when 'insight_featured' then n.insight_featured
      when 'new_polls_digest' then n.new_polls when 'follow_up' then n.new_polls when 'last_call' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true);
$$;
revoke execute on function public.notify from public, anon, authenticated;

-- 2. Last call: polls under 10 votes closing within 2 hours nudge up to 30 eligible voters,
--    each person at most once a day. One nudge round per poll.
create or replace function public.queue_last_calls()
returns void language plpgsql security definer set search_path = '' as $$
declare pl record;
begin
  for pl in
    select * from public.polls
    where status = 'active' and moderation = 'approved' and not last_call_sent and vote_count < 10
      and closes_at between now() + interval '15 minutes' and now() + interval '2 hours'
    for update skip locked
  loop
    perform public.notify(a.user_id, 'last_call', pl.id,
      jsonb_build_object('question', pl.question, 'votes_needed', 10 - pl.vote_count))
    from (
      select x as user_id from public.audience_ids(pl.creator_id, pl.type,
        coalesce((select array_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '{}'),
        pl.age_min, pl.age_max, pl.community_id) x
      where not exists (select 1 from public.votes v where v.poll_id = pl.id and v.voter_id = x)
        and not exists (select 1 from public.notifications n where n.user_id = x and n.type = 'last_call'
                        and n.created_at > now() - interval '1 day')
      order by random() limit 30
    ) a;
    update public.polls set last_call_sent = true where id = pl.id;
  end loop;
end $$;
revoke execute on function public.queue_last_calls() from public, anon, authenticated;
select cron.schedule('last-calls', '*/15 * * * *', 'select public.queue_last_calls()');

-- Creator view of their poll includes the decision.
drop function public.get_my_poll(uuid);
create or replace function public.get_my_poll(p_poll uuid)
returns table (id uuid, question text, type public.poll_type, status public.poll_status,
               vote_count int, closes_at timestamptz, created_at timestamptz, removed_reason text,
               parent_poll_id uuid, follow_up_count int,
               decision_side public.vote_side, decision_none boolean, decision_helpful boolean, decided_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.type, p.status, p.vote_count, p.closes_at, p.created_at, p.removed_reason,
    p.parent_poll_id,
    (select count(*)::int from public.polls f where f.parent_poll_id = p.id and f.status not in ('draft','deleted')),
    p.decision_side, p.decision_none, p.decision_helpful, p.decided_at
  from public.polls p
  where p.id = p_poll and p.creator_id = auth.uid() and p.status <> 'deleted';
end $$;
revoke execute on function public.get_my_poll(uuid) from public, anon;
grant execute on function public.get_my_poll(uuid) to authenticated;

-- 3. Stats: "your vote matched the asker's decision" and a forgiving weekly streak
--    (3+ votes a week; one missed week in any 8 doesn't break it).
create or replace function public.my_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u int;
  this_week int;
  streak int := 0;
  misses int := 0;
  wk date := date_trunc('week', now())::date - 7;   -- start with last completed week
  n int;
begin
  perform public.require_user();
  u := public.credit_units(auth.uid());
  select count(*) into this_week from public.votes
  where voter_id = auth.uid() and created_at >= date_trunc('week', now());
  loop
    select count(*) into n from public.votes
    where voter_id = auth.uid() and created_at >= wk and created_at < wk + 7;
    if n >= 3 then
      streak := streak + 1;
    elsif misses = 0 and streak > 0 then
      misses := 1;           -- one forgiven week
    else
      exit;
    end if;
    wk := wk - 7;
    exit when streak > 104;
  end loop;
  if this_week >= 3 then streak := streak + 1; end if;

  return (
    with rv as (select * from public.result_views where user_id = auth.uid())
    select jsonb_build_object(
      'polls_voted', (select count(*) from public.votes where voter_id = auth.uid()),
      'decided', (select count(*) from rv where in_majority is not null),
      'majority_matches', (select count(*) from rv where in_majority),
      'majority_pct', (select round(100.0 * count(*) filter (where in_majority) / nullif(count(in_majority), 0)) from rv),
      'contrarian_picks', (select count(*) from rv where in_majority = false),
      'predictions_right', (select count(*) from rv where predicted_correctly),
      'predictions_made', (select count(*) from rv where predicted_correctly is not null),
      'featured_count', (select count(*) from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
                         where v.voter_id = auth.uid() and not f.removed),
      'decision_matches', (select count(*) from public.votes v join public.polls p on p.id = v.poll_id
                           where v.voter_id = auth.uid() and p.decision_side = v.side),
      'week_votes', this_week,
      'week_streak', streak,
      'top_categories', coalesce((select jsonb_agg(name) from (
          select c.name from public.votes v join public.poll_target_categories t on t.poll_id = v.poll_id
          join public.categories c on c.id = t.category_id
          where v.voter_id = auth.uid() group by c.name order by count(*) desc limit 3) x), '[]'),
      'credits', u,
      'polls_available', u / 3));
end $$;

-- 4. Admin metrics: decisions, helpfulness and last-call effect.
create or replace function public.admin_outcome_metrics(p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => p_days);
begin
  perform public.require_admin();
  return jsonb_build_object(
    'completed', (select count(*) from public.polls where status in ('completed','failed_ai') and closes_at >= since),
    'decision_pct', (select round(100.0 * count(*) filter (where decided_at is not null) / nullif(count(*), 0))
                     from public.polls where status in ('completed','failed_ai') and closes_at >= since and creator_id is not null),
    'helpful_pct', (select round(100.0 * count(*) filter (where decision_helpful) / nullif(count(decision_helpful), 0))
                    from public.polls where decided_at >= since),
    'followed_majority_pct', (select round(100.0 * count(*) filter (where p.decision_side = r.winner) / nullif(count(*), 0))
                              from public.polls p join public.poll_results r on r.poll_id = p.id
                              where p.decided_at >= since and r.winner is not null and not p.decision_none),
    'last_calls_sent', (select count(*) from public.notifications where type = 'last_call' and created_at >= since),
    'last_call_votes', (select count(*) from public.notifications n join public.votes v
                          on v.poll_id = n.poll_id and v.voter_id = n.user_id and v.created_at > n.created_at
                        where n.type = 'last_call' and n.created_at >= since),
    'last_call_polls_reached_10', (select round(100.0 * count(*) filter (where vote_count >= 10) / nullif(count(*), 0))
                                   from public.polls where last_call_sent and closes_at >= since));
end $$;
revoke execute on function public.admin_outcome_metrics(int) from public, anon;
grant execute on function public.admin_outcome_metrics(int) to authenticated;
