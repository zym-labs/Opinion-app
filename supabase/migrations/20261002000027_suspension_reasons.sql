-- Manual suspensions carry a rule (statement of reasons, DSA Art. 17) and the user is told; so is a lift.
drop function public.admin_set_status(uuid, public.account_status, text);
create or replace function public.admin_set_status(p_user uuid, p_status public.account_status, p_rule text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin();
begin
  if p_status not in ('active','suspended') then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if p_status = 'suspended' and p_rule is null then raise exception 'RULE_REQUIRED' using errcode = 'P0001'; end if;
  update public.profiles set status = p_status where id = p_user and status <> 'deleted' and status <> p_status;
  if not found then return; end if;
  insert into public.moderation_actions (admin_id, target_user_id, action, rule, note)
  values (v_admin, p_user, case p_status when 'suspended' then 'suspend' else 'unsuspend' end, p_rule, p_note);
  perform public.notify(p_user, 'moderation_outcome', null,
    case p_status when 'suspended'
      then jsonb_build_object('kind', 'author', 'action', 'suspend', 'rule', p_rule, 'target', 'account')
      else jsonb_build_object('kind', 'account_restored') end);
end $$;
revoke execute on function public.admin_set_status(uuid, public.account_status, text, text) from public, anon;
grant execute on function public.admin_set_status(uuid, public.account_status, text, text) to authenticated;

-- Badge counts for the admin nav.
create or replace function public.admin_queue_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'reports', (select count(*) from public.reports where status = 'open'),
    'appeals', (select count(*) from public.appeals where status = 'open'),
    'ai', (select count(*) from public.polls where status = 'failed_ai'));
end $$;
revoke execute on function public.admin_queue_counts() from public, anon;
grant execute on function public.admin_queue_counts() to authenticated;
