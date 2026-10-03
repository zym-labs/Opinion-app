-- pgTAP: retention job 2 removes old moderation records and flags, keeps recent ones.
begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000c01', 'ret2@test.dev');
insert into public.moderation_actions (admin_id, target_user_id, action, created_at) values
  (null, '00000000-0000-0000-0000-000000000c01', 'warn', now() - interval '3 years'),
  (null, '00000000-0000-0000-0000-000000000c01', 'warn', now() - interval '1 year');
insert into public.crisis_counts (day, community_id, n) values (current_date - 1000, null, 3), (current_date, null, 1);

select lives_ok('select public.run_retention_2()', 'retention job runs');
select is((select count(*)::int from public.moderation_actions where target_user_id = '00000000-0000-0000-0000-000000000c01'), 1,
  'moderation records older than 2 years removed, recent kept');
select is((select count(*)::int from public.crisis_counts where day < current_date - 730), 0, 'old crisis counters removed');

select * from finish();
rollback;
