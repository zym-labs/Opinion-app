-- Phase 2: close friends circle, public result pages, private voter reputation.

-- 1. Close friends circle ------------------------------------------------------------------------
-- Each person has one circle of up to 20 friends who joined through the owner's link. Friends-only
-- polls go to the circle automatically. Nobody sees who is in a circle, only how many.
alter table public.profiles add column circle_code text unique;

create table public.circle_members (
  owner_id   uuid not null references public.profiles on delete cascade,
  member_id  uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);
create index on public.circle_members (member_id);
alter table public.circle_members enable row level security;
revoke all on public.circle_members from anon, authenticated;

create or replace function public.my_circle()
returns table (code text, members int, member_of int)
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_user();
  update public.profiles set circle_code = coalesce(circle_code, public.new_code())
  where id = auth.uid() returning circle_code into v;
  return query select v,
    (select count(*)::int from public.circle_members where owner_id = auth.uid()),
    (select count(*)::int from public.circle_members where member_id = auth.uid());
end $$;

create or replace function public.join_circle(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; v_owner uuid;
begin
  me := public.require_user();
  perform public.hit_rate_limit(me.id, 'circle_join', 20, interval '1 day');
  select id into v_owner from public.profiles where circle_code = p_code and status = 'active';
  if v_owner is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_owner = me.id then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if (select count(*) from public.circle_members where owner_id = v_owner) >= 20 then
    raise exception 'CIRCLE_FULL' using errcode = 'P0001';
  end if;
  insert into public.circle_members (owner_id, member_id) values (v_owner, me.id) on conflict do nothing;
end $$;

-- New link (old one stops working) and, optionally, an empty circle.
create or replace function public.reset_circle(p_remove_members boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v text := public.new_code();
begin
  perform public.require_user();
  update public.profiles set circle_code = v where id = auth.uid();
  if p_remove_members then delete from public.circle_members where owner_id = auth.uid(); end if;
  return v;
end $$;

-- Leave every circle you're in.
create or replace function public.leave_circles()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  delete from public.circle_members where member_id = auth.uid();
end $$;

revoke execute on function public.my_circle(), public.join_circle(text), public.reset_circle(boolean),
  public.leave_circles() from public, anon;
grant execute on function public.my_circle(), public.join_circle(text), public.reset_circle(boolean),
  public.leave_circles() to authenticated;

-- Friends-only polls reach the circle automatically.
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
  if p_friends_only then
    insert into public.poll_invitees (poll_id, user_id)
    select p_poll, m.member_id from public.circle_members m
    join public.profiles pr on pr.id = m.member_id and pr.status = 'active'
    where m.owner_id = p_user
    on conflict do nothing;
    perform public.notify(m.member_id, 'circle_poll', p_poll, jsonb_build_object('question', pl.question))
    from public.circle_members m where m.owner_id = p_user;
  end if;
  return now() + make_interval(hours => pl.duration_hours);
end $$;
revoke execute on function public.publish_poll_internal(uuid, uuid, boolean) from public, anon, authenticated;

-- 2. Public result pages -------------------------------------------------------------------------
-- The asker can publish a finished result (10+ votes) at a public link: split, AI summary and the
-- featured quotes voters agreed to share. No identities, no images, no per-person data.
alter table public.polls add column public_code text unique;

create or replace function public.set_result_public(p_poll uuid, p_public boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform public.require_user();
  if not exists (select 1 from public.polls p join public.poll_results r on r.poll_id = p.id
                 where p.id = p_poll and p.creator_id = auth.uid() and p.status = 'completed'
                   and r.total_votes >= 10) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  update public.polls set public_code = case when p_public then coalesce(public_code, public.new_code()) end
  where id = p_poll returning public_code into v;
  return v;
end $$;
revoke execute on function public.set_result_public(uuid, boolean) from public, anon;
grant execute on function public.set_result_public(uuid, boolean) to authenticated;

create or replace function public.get_public_result(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.result_payload(p.id, null, true) - 'view_once' - 'poll_id'
  from public.polls p where p.public_code = p_code and p.status = 'completed';
$$;
revoke execute on function public.get_public_result(text) from public;
grant execute on function public.get_public_result(text) to anon, authenticated;

-- 3. Private voter reputation ---------------------------------------------------------------------
-- Built nightly from quoted reasons, "helpful" marks, correct predictions and upheld moderation
-- decisions. Never shown to others. Trusted voters' reports are prioritised in the admin queue.
create table public.voter_reputation (
  user_id            uuid primary key references public.profiles on delete cascade,
  featured           int not null default 0,
  helpful            int not null default 0,
  predictions_right  int not null default 0,
  upheld_against     int not null default 0,
  score              int not null default 0,
  updated_at         timestamptz not null default now()
);
alter table public.voter_reputation enable row level security;
revoke all on public.voter_reputation from anon, authenticated;

create or replace function public.compute_reputation()
returns void language sql security definer set search_path = '' as $$
  insert into public.voter_reputation (user_id, featured, helpful, predictions_right, upheld_against, score, updated_at)
  select p.id, x.featured, x.helpful, x.predictions_right, x.upheld,
    greatest(0, x.featured * 5 + x.helpful * 2 + x.predictions_right - x.upheld * 10), now()
  from public.profiles p
  cross join lateral (
    select
      (select count(*)::int from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
       where v.voter_id = p.id and not f.removed) featured,
      (select count(*)::int from public.insight_reactions r join public.featured_insights f on f.id = r.insight_id
       join public.votes v on v.id = f.reason_vote_id where v.voter_id = p.id) helpful,
      (select count(*)::int from public.result_views rv where rv.user_id = p.id and rv.predicted_correctly) predictions_right,
      (select count(*)::int from public.moderation_actions m
       where m.target_user_id = p.id and m.action in ('remove', 'warn', 'suspend')
         and not exists (select 1 from public.appeals a where a.action_id = m.id and a.status = 'reversed')) upheld
  ) x
  where p.status <> 'deleted'
  on conflict (user_id) do update set featured = excluded.featured, helpful = excluded.helpful,
    predictions_right = excluded.predictions_right, upheld_against = excluded.upheld_against,
    score = excluded.score, updated_at = excluded.updated_at;
$$;
revoke execute on function public.compute_reputation() from public, anon, authenticated;

create or replace function public.is_trusted(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select score >= 20 and upheld_against = 0 from public.voter_reputation where user_id = p_user), false);
$$;
revoke execute on function public.is_trusted(uuid) from public, anon, authenticated;

-- Your own standing, for your private profile.
create or replace function public.my_reputation()
returns table (score int, trusted boolean, helpful int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query select coalesce(r.score, 0), public.is_trusted(auth.uid()), coalesce(r.helpful, 0)
  from (select 1) d left join public.voter_reputation r on r.user_id = auth.uid();
end $$;
revoke execute on function public.my_reputation() from public, anon;
grant execute on function public.my_reputation() to authenticated;

-- Reports from trusted voters get one severity step higher (max 3), so they're seen sooner.
create or replace function public.submit_report(
  p_target public.report_target, p_target_id uuid, p_reason public.report_reason, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  found_target boolean;
  sev smallint;
begin
  perform public.require_user();
  perform public.hit_rate_limit(auth.uid(), 'report', 20, interval '1 day');
  if p_target = 'poll' then
    found_target := exists (select 1 from public.polls where id = p_target_id and status not in ('draft','deleted'));
  elsif p_target = 'reason' then
    found_target := exists (select 1 from public.reasons where vote_id = p_target_id);
  else
    found_target := exists (select 1 from public.featured_insights where id = p_target_id and not removed);
  end if;
  if not found_target then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  sev := case when p_reason in ('self_harm','hate','sexual') then 3
              when p_reason in ('harassment','personal_info') then 2 else 1 end;
  if public.is_trusted(auth.uid()) then sev := least(3, sev + 1); end if;
  insert into public.reports (reporter_id, target_type, poll_id, reason_vote_id, featured_insight_id, reason, note, severity)
  values (auth.uid(), p_target,
          case p_target when 'poll' then p_target_id end,
          case p_target when 'reason' then p_target_id end,
          case p_target when 'featured_insight' then p_target_id end,
          p_reason, nullif(trim(p_note), ''), sev)
  on conflict do nothing;
end $$;
grant execute on function public.submit_report(public.report_target, uuid, public.report_reason, text) to authenticated;

select cron.schedule('reputation', '45 3 * * *', 'select public.compute_reputation()');
