-- Engagement: "this helped" on featured quotes, browse by category, boosts.

-- 1. Helpful reactions on featured quotes ------------------------------------------------------
-- People who voted on the poll (and its creator) can mark a featured quote as helpful, once.
-- Only the quote's author sees the total, on their "quoted reasons" page.
create table public.insight_reactions (
  insight_id uuid not null references public.featured_insights on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (insight_id, user_id)
);
alter table public.insight_reactions enable row level security;
revoke all on public.insight_reactions from anon, authenticated;

create or replace function public.mark_insight_helpful(p_insight uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; f public.featured_insights;
begin
  me := public.require_user();
  perform public.hit_rate_limit(me.id, 'insight_reaction', 100, interval '1 day');
  select * into f from public.featured_insights where id = p_insight and not removed;
  if f.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.votes where poll_id = f.poll_id and voter_id = me.id)
     and not exists (select 1 from public.polls where id = f.poll_id and creator_id = me.id) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.votes where id = f.reason_vote_id and voter_id = me.id) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';   -- not your own quote
  end if;
  insert into public.insight_reactions (insight_id, user_id) values (p_insight, me.id) on conflict do nothing;
end $$;
revoke execute on function public.mark_insight_helpful(uuid) from public, anon;
grant execute on function public.mark_insight_helpful(uuid) to authenticated;

drop function public.my_featured_insights();
create or replace function public.my_featured_insights()
returns table (quote text, question text, featured_at timestamptz, helpful int)
language sql stable security definer set search_path = '' as $$
  select f.quote, p.question, r.generated_at,
    (select count(*)::int from public.insight_reactions x where x.insight_id = f.id)
  from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
  join public.polls p on p.id = f.poll_id join public.poll_results r on r.poll_id = f.poll_id
  where v.voter_id = auth.uid() and not f.removed
  order by r.generated_at desc;
$$;
revoke execute on function public.my_featured_insights() from public, anon;
grant execute on function public.my_featured_insights() to authenticated;

-- 2. Browse by category ------------------------------------------------------------------------
-- Open expert polls in one category. can_vote is false when the poll targets an age range you're
-- outside, or the category isn't one of yours (the app then offers to add it). No counts, no creators.
create or replace function public.browse_polls(p_category smallint, p_limit int default 30)
returns table (id uuid, question text, closes_at timestamptz, is_taste boolean, options jsonb, can_vote boolean)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  return query
  select p.id, p.question, p.closes_at, p.is_taste,
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path) order by o.side)
     from public.poll_options o where o.poll_id = p.id),
    exists (select 1 from public.poll_target_categories t join public.user_categories uc
            on uc.category_id = t.category_id where t.poll_id = p.id and uc.user_id = me.id)
      and (p.age_min is null or extract(year from now())::int - me.birth_year between p.age_min and p.age_max)
  from public.polls p
  join public.poll_target_categories t on t.poll_id = p.id and t.category_id = p_category
  where p.status = 'active' and p.moderation = 'approved' and p.closes_at > now() and not p.friends_only
    and p.creator_id is distinct from me.id
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
  order by p.closes_at
  limit least(p_limit, 50);
end $$;
revoke execute on function public.browse_polls(smallint, int) from public, anon;
grant execute on function public.browse_polls(smallint, int) to authenticated;

-- 3. Boost -------------------------------------------------------------------------------------
-- Spend one poll's worth of credit to notify up to 50 more eligible people who haven't voted.
-- Once per poll; shares the one-nudge-a-day cap with last calls so nobody gets spammed.
alter table public.polls add column boosted_at timestamptz;

create or replace function public.boost_poll(p_poll uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles; pl public.polls; n int;
begin
  me := public.require_user();
  select * into pl from public.polls where id = p_poll and creator_id = me.id for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status <> 'active' or pl.closes_at < now() + interval '30 minutes' then
    raise exception 'POLL_CLOSED' using errcode = 'P0001';
  end if;
  if pl.friends_only then raise exception 'NOT_ELIGIBLE' using errcode = 'P0001'; end if;
  if pl.boosted_at is not null then raise exception 'ALREADY_BOOSTED' using errcode = 'P0001'; end if;
  if public.credit_units(me.id) < 3 then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;

  insert into public.credit_ledger (user_id, delta, reason, poll_id) values (me.id, -3, 'boost', p_poll);
  update public.polls set boosted_at = now() where id = p_poll;

  with picked as (
    select x as user_id from public.audience_ids(pl.creator_id, pl.type,
      coalesce((select array_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '{}'),
      pl.age_min, pl.age_max, pl.community_id) x
    where not exists (select 1 from public.votes v where v.poll_id = pl.id and v.voter_id = x)
      and not exists (select 1 from public.notifications n where n.user_id = x
                      and n.type in ('last_call', 'boosted_poll') and n.created_at > now() - interval '1 day')
    order by random() limit 50
  )
  select count(*) into n from (
    select public.notify(user_id, 'boosted_poll', pl.id, jsonb_build_object('question', pl.question)) from picked
  ) s;
  return n;
end $$;
revoke execute on function public.boost_poll(uuid) from public, anon;
grant execute on function public.boost_poll(uuid) to authenticated;

-- Last calls also respect the shared cap.
create or replace function public.queue_last_calls()
returns void language plpgsql security definer set search_path = '' as $$
declare pl record;
begin
  for pl in
    select * from public.polls
    where status = 'active' and moderation = 'approved' and not last_call_sent and vote_count < 10
      and not friends_only
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
        and not exists (select 1 from public.notifications n where n.user_id = x
                        and n.type in ('last_call', 'boosted_poll') and n.created_at > now() - interval '1 day')
      order by random() limit 30
    ) a;
    update public.polls set last_call_sent = true where id = pl.id;
  end loop;
end $$;
revoke execute on function public.queue_last_calls() from public, anon, authenticated;

-- Boost notifications follow the "new polls" preference.
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'decision_made' then n.poll_ended
      when 'summary_ready' then n.summary_ready when 'decision_reminder' then n.summary_ready
      when 'insight_featured' then n.insight_featured
      when 'new_polls_digest' then n.new_polls when 'follow_up' then n.new_polls when 'last_call' then n.new_polls
      when 'boosted_poll' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true);
$$;
revoke execute on function public.notify from public, anon, authenticated;
