-- pgTAP: decision outcomes and last-call nudges.
begin;
select plan(6);

insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((600 + i)::text, 12, '0'))::uuid, 'o' || i || '@test.dev'
from generate_series(0, 30) i;
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id::text like '00000000-0000-0000-0000-0000000006%';
insert into public.user_categories (user_id, category_id)
select p.id, (select id from public.categories where slug = 'tech') from public.profiles p
where p.id::text like '00000000-0000-0000-0000-0000000006%';

-- A completed poll with 3 voters (2 chose a, 1 chose b).
insert into public.polls (id, creator_id, type, question, duration_hours, status, moderation, closes_at)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000600', 'expert', 'Decided poll?', 6,
  'completed', 'approved', now() - interval '1 hour');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000d001', 'a', 'Laptop'), ('00000000-0000-0000-0000-00000000d001', 'b', 'Tablet');
insert into public.votes (poll_id, voter_id, side, feature_consent)
select '00000000-0000-0000-0000-00000000d001', ('00000000-0000-0000-0000-' || lpad((600 + i)::text, 12, '0'))::uuid,
  (case when i <= 2 then 'a' else 'b' end)::public.vote_side, true
from generate_series(1, 3) i;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000601"}';
select throws_ok($$select public.record_decision('00000000-0000-0000-0000-00000000d001', 'a', true)$$, 'POLL_NOT_FOUND',
  'only the asker records the decision');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000600"}';
select lives_ok($$select public.record_decision('00000000-0000-0000-0000-00000000d001', 'a', true)$$, 'asker records decision');
select throws_ok($$select public.record_decision('00000000-0000-0000-0000-00000000d001', 'b', true)$$, 'ALREADY_DECIDED',
  'decision is recorded once');

reset role;
select is((select count(*)::int from public.notifications where type = 'decision_made'), 3, 'all voters told the outcome');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000601"}';
select is((public.my_stats()->>'decision_matches')::int, 1, 'voter sees their vote matched the decision');

-- Last call: an active poll with 2 votes closing in 1 hour nudges eligible voters once.
reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, status, moderation, published_at, closes_at, vote_count)
values ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-000000000600', 'expert', 'Needs votes?', 3,
  'active', 'approved', now() - interval '2 hours', now() + interval '1 hour', 2);
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000d002', 'a', 'A'), ('00000000-0000-0000-0000-00000000d002', 'b', 'B');
insert into public.poll_target_categories (poll_id, category_id)
select '00000000-0000-0000-0000-00000000d002', id from public.categories where slug = 'tech';
select public.queue_last_calls();
select public.queue_last_calls();
select is((select count(*)::int from public.notifications where type = 'last_call'), 30, 'up to 30 nudges, sent once');

select * from finish();
rollback;
