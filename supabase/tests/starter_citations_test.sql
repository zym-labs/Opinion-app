-- pgTAP: starter polls for logged-out newcomers and per-point citations.
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'voter@test.dev');

insert into public.polls (id, type, is_taste, question, community_id, duration_hours, status, moderation, is_starter, closes_at)
select '00000000-0000-0000-0000-00000000aa01', 'community', false, 'Library or cafe for a study day?', id, 6, 'completed', 'approved', true, now() - interval '1 day'
from public.communities limit 1;
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000aa01', 'a', 'Library'), ('00000000-0000-0000-0000-00000000aa01', 'b', 'Cafe');
insert into public.votes (id, poll_id, voter_id, side, feature_consent) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1', 'a', true);
insert into public.reasons (vote_id, body, moderation) values
  ('00000000-0000-0000-0000-00000000bb01', 'Quiet floors and no pressure to keep buying coffee', 'approved');
insert into public.poll_results (poll_id, total_votes, votes_a, votes_b, pct_a, pct_b, winner, summary_majority, summary_minority, summary_points)
values ('00000000-0000-0000-0000-00000000aa01', 20, 13, 7, 65, 35, 'a', 'Quiet and free.', 'Cafes feel social.',
  '[{"side":"a","text":"Quiet and free.","reason_ids":["00000000-0000-0000-0000-00000000bb01","00000000-0000-0000-0000-00000000bb99"]},
    {"side":"b","text":"Cafes feel social.","reason_ids":[]}]');
insert into public.featured_insights (id, poll_id, reason_vote_id, quote, side, rank) values
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000bb01',
   'Quiet floors and no pressure to keep buying coffee', 'a', 1);

set local role anon;
select lives_ok('select public.get_starter_polls()', 'logged-out users can load starter polls');
select is(jsonb_array_length(public.get_starter_polls()), 1, 'one starter poll returned');
select is((public.get_starter_polls()->0->'summary'->'points'->0->>'reason_count')::int, 2, 'point shows how many reasons back it');
select is(public.get_starter_polls()->0->'summary'->'points'->0->'quote_ids'->>0, '00000000-0000-0000-0000-00000000cc01',
  'point links to the featured quote it draws on');
select ok(public.get_starter_polls()::text not like '%bb01%', 'vote ids never reach the client');
select ok(public.get_starter_polls()::text not like '%0000000000d1%', 'voter ids never reach the client');
select throws_ok('select public.get_feed()', '42501', null, 'anon still cannot use other functions');

select * from finish();
rollback;
