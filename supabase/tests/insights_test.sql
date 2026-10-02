-- pgTAP: creator insights are private and k-anonymous.
begin;
select plan(5);

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((300 + i)::text, 12, '0'))::uuid, 'i' || i || '@test.dev'
from generate_series(0, 14) i;
update public.profiles set onboarding_step = 'complete', birth_year = 1990
where id::text like '00000000-0000-0000-0000-0000000003%';

insert into public.polls (id, creator_id, type, question, community_id, duration_hours, status, moderation, closes_at)
select '00000000-0000-0000-0000-00000000c0de', '00000000-0000-0000-0000-000000000300', 'community', 'Insight poll?', id, 6,
  'completed', 'approved', now() - interval '1 hour'
from public.communities limit 1;
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000c0de', 'a', 'Yes'), ('00000000-0000-0000-0000-00000000c0de', 'b', 'No');
insert into public.votes (poll_id, voter_id, side, predicted_side, feature_consent)
select '00000000-0000-0000-0000-00000000c0de', ('00000000-0000-0000-0000-' || lpad((300 + i)::text, 12, '0'))::uuid,
  (case when i <= 10 then 'a' else 'b' end)::public.vote_side, 'a', i % 2 = 0
from generate_series(1, 14) i;
insert into public.poll_results (poll_id, total_votes, winner) values ('00000000-0000-0000-0000-00000000c0de', 14, 'a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000301"}';
select throws_ok($$select public.get_poll_insights('00000000-0000-0000-0000-00000000c0de')$$, 'POLL_NOT_FOUND',
  'only the creator sees insights');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000300"}';
select is((public.get_poll_insights('00000000-0000-0000-0000-00000000c0de')->'verified'), 'null'::jsonb,
  'groups under 10 votes are hidden');
select is((public.get_poll_insights('00000000-0000-0000-0000-00000000c0de')->'self_selected'->>'a')::numeric, 71.4,
  'self-selected split shown with 14 votes');
select is((public.get_poll_insights('00000000-0000-0000-0000-00000000c0de')->'predictions'->>'right_pct')::int, 100,
  'prediction accuracy');
select is((public.get_poll_insights('00000000-0000-0000-0000-00000000c0de')->>'quote_consent_pct')::int, 50,
  'share of voters agreeing to be quoted');

select * from finish();
rollback;
