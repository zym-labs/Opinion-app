-- pgTAP: admin access, moderation actions, statements of reasons, disposable emails.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.dev'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator@test.dev'),
  ('00000000-0000-0000-0000-0000000000b1', 'reporter@test.dev');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1');

select throws_ok($$insert into auth.users (id, email) values (gen_random_uuid(), 'x@mailinator.com')$$,
  'DISPOSABLE_EMAIL', 'disposable email blocked');

insert into public.polls (id, creator_id, type, question, community_id, duration_hours, status, moderation, published_at, closes_at)
select '00000000-0000-0000-0000-00000000f011', '00000000-0000-0000-0000-0000000000c1', 'community',
  'Which flat should we rent?', id, 6, 'active', 'approved', now(), now() + interval '6 hours'
from public.communities limit 1;
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000f011', 'a', 'North'), ('00000000-0000-0000-0000-00000000f011', 'b', 'South');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","aal":"aal1"}';
select lives_ok($$select public.submit_report('poll', '00000000-0000-0000-0000-00000000f011', 'harassment', 'names a person')$$,
  'user can report');
select throws_ok($$select public.admin_metrics()$$, 'UNAUTHENTICATED', 'non-admin cannot use admin functions');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","aal":"aal1"}';
select throws_ok($$select public.admin_metrics()$$, 'MFA_REQUIRED', 'admin needs two-factor session');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","aal":"aal2"}';
select is((select count(*)::int from public.admin_queue()), 1, 'report appears in queue');
select throws_ok($$select public.admin_act((select report_id from public.admin_queue() limit 1), 'remove')$$,
  'RULE_REQUIRED', 'removal needs a rule');
select lives_ok($$select public.admin_act((select report_id from public.admin_queue() limit 1), 'remove', 'harassment')$$,
  'admin removes poll');

reset role;
select is((select status::text from public.polls where id = '00000000-0000-0000-0000-00000000f011'), 'removed', 'poll removed');
select is((select count(*)::int from public.notifications where type = 'moderation_outcome'), 2,
  'reporter and author are told the outcome');

select * from finish();
rollback;
