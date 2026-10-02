-- pgTAP: unread count and notification pruning.
begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000008a1', 'notif8@test.dev');
insert into public.notifications (user_id, type, payload, read_at, created_at) values
  ('00000000-0000-0000-0000-0000000008a1', 'poll_ended', '{}', null, now()),
  ('00000000-0000-0000-0000-0000000008a1', 'poll_ended', '{}', now() - interval '100 days', now() - interval '100 days'),
  ('00000000-0000-0000-0000-0000000008a1', 'poll_ended', '{}', now() - interval '10 days', now() - interval '10 days');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000008a1"}';
select is(public.unread_notification_count(), 1, 'counts unread only');
reset role;

select public.prune_notifications();
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000008a1'), 2,
  'old read notifications are pruned, recent ones kept');

set local role authenticated;
select throws_ok('select public.prune_notifications()', '42501', null, 'users cannot run the pruner');

select * from finish();
rollback;
