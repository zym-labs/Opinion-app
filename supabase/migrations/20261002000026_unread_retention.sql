-- Unread badge, and notification retention (data minimisation): read notifications go after 90 days, all after 1 year.

create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function public.unread_notification_count()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null;
$$;
revoke execute on function public.unread_notification_count() from public, anon;
grant execute on function public.unread_notification_count() to authenticated;

create or replace function public.prune_notifications()
returns void language sql security definer set search_path = '' as $$
  delete from public.notifications
  where (read_at is not null and read_at < now() - interval '90 days') or created_at < now() - interval '1 year';
$$;
revoke execute on function public.prune_notifications() from public, anon, authenticated;

select cron.schedule('prune-notifications', '17 3 * * *', 'select public.prune_notifications()');

-- Appeals history: include who resolved it and their note.
drop function public.admin_appeals(public.appeal_status);
create or replace function public.admin_appeals(p_status public.appeal_status default 'open')
returns table (appeal_id uuid, message text, created_at timestamptz, action text, rule text, action_note text,
               decided_by text, handle text, question text, report_id uuid, admin_note text, resolved_by text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select a.id, a.message, a.created_at, m.action, m.rule, m.note,
    (select pr.handle from public.profiles pr where pr.id = m.admin_id),
    (select pr.handle from public.profiles pr where pr.id = a.user_id),
    (select p.question from public.polls p where p.id = m.poll_id), m.report_id, a.admin_note,
    (select pr.handle from public.profiles pr where pr.id = a.admin_id)
  from public.appeals a join public.moderation_actions m on m.id = a.action_id
  where a.status = p_status
  order by case when p_status = 'open' then a.created_at end, a.resolved_at desc
  limit 200;
end $$;
revoke execute on function public.admin_appeals(public.appeal_status) from public, anon;
grant execute on function public.admin_appeals(public.appeal_status) to authenticated;
