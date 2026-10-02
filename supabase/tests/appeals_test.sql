-- pgTAP: appeals restore content when reversed; one appeal per decision; My Polls paging.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007a1', 'admin7@test.dev'),
  ('00000000-0000-0000-0000-0000000007c1', 'author7@test.dev'),
  ('00000000-0000-0000-0000-0000000007b1', 'reporter7@test.dev');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000007a1';
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id in ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007b1');

insert into public.polls (id, creator_id, type, question, community_id, duration_hours, status, moderation, published_at, closes_at)
select '00000000-0000-0000-0000-00000000a701', '00000000-0000-0000-0000-0000000007c1', 'community',
  'Appealable poll?', id, 6, 'active', 'approved', now(), now() + interval '6 hours'
from public.communities limit 1;
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000a701', 'a', 'A'), ('00000000-0000-0000-0000-00000000a701', 'b', 'B');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007b1"}';
select public.submit_report('poll', '00000000-0000-0000-0000-00000000a701', 'spam');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007a1","aal":"aal2"}';
select public.admin_act((select report_id from public.admin_queue() limit 1), 'remove', 'spam');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007c1"}';
select is((select count(*)::int from public.my_moderation_actions() where can_appeal), 1, 'author sees an appealable decision');
select lives_ok($$select public.submit_appeal((select action_id from public.my_moderation_actions() limit 1),
  'This was a genuine question, not spam.')$$, 'author appeals');
select throws_ok($$select public.submit_appeal((select action_id from public.my_moderation_actions() limit 1),
  'Second try at the same appeal.')$$, 'ALREADY_APPEALED', 'one appeal per decision');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007a1","aal":"aal2"}';
select public.admin_resolve_appeal((select appeal_id from public.admin_appeals() limit 1), true, 'Looks genuine');
reset role;
select is((select status::text from public.polls where id = '00000000-0000-0000-0000-00000000a701'), 'active', 'reversed appeal restores the poll');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007c1"}';
select is((select appeal_status::text from public.my_moderation_actions() limit 1), 'reversed', 'author sees the outcome');
select is((select count(*)::int from public.get_my_polls(false, now() + interval '1 day', 30)), 1, 'My Polls paging returns the page');

select * from finish();
rollback;
