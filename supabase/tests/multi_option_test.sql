-- pgTAP: polls with 3-4 options.
begin;
select plan(6);

insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((100 + i)::text, 12, '0'))::uuid, 'm' || i || '@test.dev'
from generate_series(1, 25) i;
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id::text like '00000000-0000-0000-0000-0000000001%';
insert into public.user_categories (user_id, category_id)
select p.id, (select id from public.categories where slug = 'tech') from public.profiles p
where p.id::text like '00000000-0000-0000-0000-0000000001%';
insert into public.credit_ledger (user_id, delta, reason) values ('00000000-0000-0000-0000-000000000101', 3, 'signup_bonus');

select throws_ok($$select public.create_poll_draft('00000000-0000-0000-0000-000000000101', 'expert', false, 'Too many options?',
  array['A','B','C','D','E'], array[(select id from public.categories where slug = 'tech')]::smallint[], null, null, null, 6::smallint, 'approved')$$,
  'INVALID_INPUT', 'at most 4 options');

select lives_ok($$select public.create_poll_draft('00000000-0000-0000-0000-000000000101', 'expert', false, 'Which laptop for CS?',
  array['MacBook','ThinkPad','Dell XPS'], array[(select id from public.categories where slug = 'tech')]::smallint[], null, null, null, 6::smallint, 'approved')$$,
  'three-option draft');
select is((select count(*)::int from public.poll_options o join public.polls p on p.id = o.poll_id where p.question = 'Which laptop for CS?'), 3, 'three options stored');
select public.publish_poll_internal('00000000-0000-0000-0000-000000000101', (select id from public.polls where question = 'Which laptop for CS?'));

select throws_ok($$select public.cast_vote_internal('00000000-0000-0000-0000-000000000102',
  (select id from public.polls where question = 'Which laptop for CS?'), 'd', 'Option d does not exist in this poll at all', null, true, 'approved', null)$$,
  'INVALID_INPUT', 'cannot vote for a missing option');

-- 12 votes: 6 for c, 4 for a, 2 for b → c wins with 50%.
select public.cast_vote_internal(('00000000-0000-0000-0000-' || lpad((100 + i)::text, 12, '0'))::uuid,
  (select id from public.polls where question = 'Which laptop for CS?'),
  (case when i <= 7 then 'c' when i <= 11 then 'a' else 'b' end)::public.vote_side,
  'A reason that is definitely long enough', null, true, 'approved', null)
from generate_series(2, 13) i;
update public.polls set closes_at = now() - interval '1 second' where question = 'Which laptop for CS?';
select public.close_due_polls();
select is((select winner::text from public.poll_results r join public.polls p on p.id = r.poll_id where p.question = 'Which laptop for CS?'), 'c', 'top option wins');
select is((select (pcts->>'c')::numeric from public.poll_results r join public.polls p on p.id = r.poll_id where p.question = 'Which laptop for CS?'), 50.00, 'percentages for every option');

select * from finish();
rollback;
