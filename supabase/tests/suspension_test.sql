-- pgTAP: manual suspension needs a rule, notifies the user, and can be appealed and reversed.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009a1', 'admin9@test.dev'),
  ('00000000-0000-0000-0000-0000000009c1', 'user9@test.dev');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000009a1';
update public.profiles set onboarding_step = 'complete', birth_year = 1995 where id = '00000000-0000-0000-0000-0000000009c1';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a1","aal":"aal2"}';
select throws_ok($$select public.admin_set_status('00000000-0000-0000-0000-0000000009c1', 'suspended')$$,
  'RULE_REQUIRED', 'suspension needs a rule');
select public.admin_set_status('00000000-0000-0000-0000-0000000009c1', 'suspended', 'spam', 'bot-like voting');
select is((public.admin_queue_counts() ->> 'appeals')::int, 0, 'no open appeals yet');

reset role;
select is((select payload ->> 'rule' from public.notifications where user_id = '00000000-0000-0000-0000-0000000009c1'),
  'spam', 'user is told which rule');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009c1"}';
select public.submit_appeal((select action_id from public.my_moderation_actions() limit 1), 'I am a real person, not a bot.');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a1","aal":"aal2"}';
select is((public.admin_queue_counts() ->> 'appeals')::int, 1, 'appeal shows in the nav count');
select public.admin_resolve_appeal((select appeal_id from public.admin_appeals() limit 1), true, 'Verified');

reset role;
select is((select status::text from public.profiles where id = '00000000-0000-0000-0000-0000000009c1'), 'active',
  'reversed appeal lifts the suspension');
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000009c1'), 2,
  'user notified of suspension and appeal outcome');

select * from finish();
rollback;
