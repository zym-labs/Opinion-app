-- pgTAP: Relationships topic, campus support and crisis counts, assistant helpers.
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a01', 'admin5@test.dev'),
  ('00000000-0000-0000-0000-000000000a02', 'student5@test.dev');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000a01';
insert into public.communities (id, slug, name, description, kind)
values ('00000000-0000-0000-0000-00000000ca01', 'p5-campus', 'P5 Campus', 'Test', 'campus');
insert into public.user_communities (user_id, community_id) values ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-00000000ca01');

select is((select is_sensitive from public.categories where slug = 'relationships'), true, 'Relationships is a sensitive topic');
select isnt((select safety_note from public.categories where slug = 'relationships'), null, 'with a safety note');

-- Campus support line shows for members.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a01","aal":"aal2"}';
select public.admin_set_community_support('00000000-0000-0000-0000-00000000ca01', 'Campus Counselling', '+1 555 0100', 'https://example.edu/help');
select throws_ok($$select public.admin_set_community_support('00000000-0000-0000-0000-00000000ca01', 'x', null, 'http://insecure')$$,
  'INVALID_INPUT', 'support links must be https');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a02"}';
select is((select phone from public.my_campus_support()), '+1 555 0100', 'members see their campus support line');

-- Crisis counts: per day and campus, no identity; partner report suppresses small numbers.
reset role;
select public.record_crisis('00000000-0000-0000-0000-000000000a02');
select public.record_crisis('00000000-0000-0000-0000-000000000a02');
select is((select n from public.crisis_counts where community_id = '00000000-0000-0000-0000-00000000ca01'), 2, 'counted per campus');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a01","aal":"aal2"}';
select is(public.admin_campus_report('00000000-0000-0000-0000-00000000ca01', 30) ->> 'crisis_support_shown', 'fewer than 5',
  'small numbers suppressed in partner reports');

-- Assistant helpers are service-only.
select throws_ok($$select public.mcp_my_polls('00000000-0000-0000-0000-000000000a02')$$, '42501', null, 'users cannot call assistant helpers');
reset role;
select is(public.mcp_my_polls('00000000-0000-0000-0000-000000000a02'), '[]'::jsonb, 'service role gets the poll list');

select * from finish();
rollback;
