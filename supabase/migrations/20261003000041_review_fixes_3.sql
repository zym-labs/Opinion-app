-- Review fixes (Phases 1–5).

-- 1. Public result pages must not include the asker's private AI second opinion.
create or replace function public.get_public_result(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.result_payload(p.id, null, true) - 'view_once' - 'poll_id' - 'ai_take'
  from public.polls p where p.public_code = p_code and p.status = 'completed';
$$;
revoke execute on function public.get_public_result(text) from public;
grant execute on function public.get_public_result(text) to anon, authenticated;

-- 2. Sponsored and daily polls are created by admins, not members: the 48-hour limit is about Opinion+.
create or replace function public.check_poll_duration() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.duration_hours > 24 and new.daily_on is null and new.sponsor_name is null
     and not public.has_plus(new.creator_id) then
    raise exception 'PLUS_REQUIRED' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.check_poll_duration() from public, anon, authenticated;

-- 3. Account deletion: finished polls stay as anonymous totals, but everything private or linkable goes:
--    10/10/10 notes, the decision and check-in, the AI second opinion, public pages and share links.
create or replace function public.prepare_account_deletion(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.polls set status = 'removed', removed_reason = 'creator_deleted'
  where creator_id = p_user and status in ('draft','active','closing','summarizing');
  update public.polls set reflection = null, public_code = null, invite_code = null,
    decision_side = null, decision_none = false, decision_helpful = null, decided_at = null,
    checkin_glad = null, checkin_at = null
  where creator_id = p_user;
  update public.poll_results set ai_take = null
  where poll_id in (select id from public.polls where creator_id = p_user);
  delete from public.rooms where host_id = p_user;
  update public.profiles set status = 'deleted', deleted_at = now(), referral_code = null, circle_code = null
  where id = p_user;
end $$;
revoke execute on function public.prepare_account_deletion from public, anon, authenticated;
