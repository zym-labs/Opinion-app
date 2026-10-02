-- My Polls paging, and moderation appeals (EU DSA-style internal complaint handling).

-- 1. My Polls: 30 per page, newest first, cursor = created_at of the last item.
drop function public.get_my_polls(boolean);
create or replace function public.get_my_polls(p_completed boolean, p_before timestamptz default null, p_limit int default 30)
returns table (id uuid, question text, type public.poll_type, status public.poll_status,
               vote_count int, closes_at timestamptz, created_at timestamptz, removed_reason text,
               parent_poll_id uuid, follow_up_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.type, p.status, p.vote_count, p.closes_at, p.created_at, p.removed_reason,
    p.parent_poll_id,
    (select count(*)::int from public.polls f where f.parent_poll_id = p.id and f.status not in ('draft','deleted'))
  from public.polls p
  where p.creator_id = auth.uid() and p.status <> 'deleted'
    and (case when p_completed then p.status in ('completed','failed_ai','removed')
              else p.status in ('draft','active','closing','summarizing') end)
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc limit least(p_limit, 100);
end $$;
revoke execute on function public.get_my_polls(boolean, timestamptz, int) from public, anon;
grant execute on function public.get_my_polls(boolean, timestamptz, int) to authenticated;

-- 2. Appeals.
create type public.appeal_status as enum ('open','upheld','reversed');

create table public.appeals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  action_id    uuid not null unique references public.moderation_actions on delete cascade,  -- one appeal per decision
  message      text not null check (char_length(message) between 10 and 1000),
  status       public.appeal_status not null default 'open',
  admin_id     uuid references public.profiles on delete set null,
  admin_note   text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
alter table public.appeals enable row level security;
revoke all on public.appeals from anon, authenticated;

-- Decisions against the caller, with appeal state. Works for suspended accounts too (they must be able to appeal).
create or replace function public.my_moderation_actions()
returns table (action_id uuid, action text, rule text, created_at timestamptz, question text,
               appeal_status public.appeal_status, can_appeal boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  return query
  select m.id, m.action, m.rule, m.created_at, p.question, a.status,
    a.id is null and m.action in ('remove','warn','suspend') and m.created_at > now() - interval '6 months'
  from public.moderation_actions m
  left join public.polls p on p.id = m.poll_id
  left join public.appeals a on a.action_id = m.id
  where m.target_user_id = auth.uid() and m.action in ('remove','warn','suspend')
  order by m.created_at desc;
end $$;
revoke execute on function public.my_moderation_actions() from public, anon;
grant execute on function public.my_moderation_actions() to authenticated;

create or replace function public.submit_appeal(p_action uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.moderation_actions;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  select * into m from public.moderation_actions where id = p_action and target_user_id = auth.uid();
  if m.id is null or m.action not in ('remove','warn','suspend') or m.created_at < now() - interval '6 months' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.appeals (user_id, action_id, message) values (auth.uid(), p_action, trim(p_message))
  on conflict (action_id) do nothing;
  if not found then raise exception 'ALREADY_APPEALED' using errcode = 'P0001'; end if;
end $$;
revoke execute on function public.submit_appeal(uuid, text) from public, anon;
grant execute on function public.submit_appeal(uuid, text) to authenticated;

-- Admin side: list and resolve. A different moderator should handle the appeal (shown in the UI).
create or replace function public.admin_appeals(p_status public.appeal_status default 'open')
returns table (appeal_id uuid, message text, created_at timestamptz, action text, rule text, action_note text,
               decided_by text, handle text, question text, report_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select a.id, a.message, a.created_at, m.action, m.rule, m.note,
    (select pr.handle from public.profiles pr where pr.id = m.admin_id),
    (select pr.handle from public.profiles pr where pr.id = a.user_id),
    (select p.question from public.polls p where p.id = m.poll_id), m.report_id
  from public.appeals a join public.moderation_actions m on m.id = a.action_id
  where a.status = p_status order by a.created_at;
end $$;

create or replace function public.admin_resolve_appeal(p_appeal uuid, p_reverse boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  a public.appeals;
  m public.moderation_actions;
  r public.reports;
begin
  select * into a from public.appeals where id = p_appeal and status = 'open' for update;
  if a.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into m from public.moderation_actions where id = a.action_id;
  select * into r from public.reports where id = m.report_id;

  if p_reverse then
    -- Undo the decision: restore content and the account.
    if m.action in ('remove','suspend') then
      if r.target_type = 'poll' then
        update public.polls set status = 'active', removed_reason = null where id = r.poll_id and status = 'removed';
      elsif r.target_type = 'reason' then
        update public.reasons set moderation = 'approved' where vote_id = r.reason_vote_id;
        update public.featured_insights set removed = false where reason_vote_id = r.reason_vote_id;
      elsif r.target_type = 'featured_insight' then
        update public.featured_insights set removed = false where id = r.featured_insight_id;
      end if;
    end if;
    if m.action = 'suspend' then
      update public.profiles set status = 'active' where id = a.user_id and status = 'suspended';
    end if;
  end if;

  update public.appeals set status = case when p_reverse then 'reversed'::public.appeal_status else 'upheld' end,
    admin_id = v_admin, admin_note = p_note, resolved_at = now()
  where id = a.id;
  insert into public.moderation_actions (admin_id, report_id, target_user_id, poll_id, action, note)
  values (v_admin, m.report_id, a.user_id, m.poll_id, case when p_reverse then 'restore' else 'dismiss' end,
          'appeal: ' || coalesce(p_note, ''));
  perform public.notify(a.user_id, 'moderation_outcome', m.poll_id,
    jsonb_build_object('kind', 'appeal', 'outcome', case when p_reverse then 'reversed' else 'upheld' end));
end $$;
revoke execute on function public.admin_appeals(public.appeal_status), public.admin_resolve_appeal(uuid, boolean, text) from public, anon;
grant execute on function public.admin_appeals(public.appeal_status), public.admin_resolve_appeal(uuid, boolean, text) to authenticated;
