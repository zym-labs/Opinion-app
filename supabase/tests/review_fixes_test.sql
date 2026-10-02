-- pgTAP: review fixes round 2.
begin;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a1', 'r1@test.dev');
insert into public.polls (id, type, question, community_id, duration_hours, status, moderation, closes_at)
select '00000000-0000-0000-0000-00000000fa01', 'community', 'Stuck job poll?', id, 6, 'summarizing', 'approved', now() - interval '1 hour'
from public.communities limit 1;
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000fa01', 'a', 'A'), ('00000000-0000-0000-0000-00000000fa01', 'b', 'B');
insert into public.poll_results (poll_id, total_votes) values ('00000000-0000-0000-0000-00000000fa01', 12);

-- A vote with a reason keeps a durable flag even after the reason is deleted by retention.
insert into public.votes (id, poll_id, voter_id, side, feature_consent)
values ('00000000-0000-0000-0000-00000000fb01', '00000000-0000-0000-0000-00000000fa01', '00000000-0000-0000-0000-0000000005a1', 'a', true);
insert into public.reasons (vote_id, body, moderation) values ('00000000-0000-0000-0000-00000000fb01', 'A reason long enough to count', 'approved');
delete from public.reasons where vote_id = '00000000-0000-0000-0000-00000000fb01';
select ok((select gave_reason from public.votes where id = '00000000-0000-0000-0000-00000000fb01'), 'gave_reason survives reason deletion');

-- A job stuck in 'running' is re-queued; the stored reason count is kept once it succeeds.
insert into public.ai_jobs (id, poll_id, attempt, status, started_at)
values ('00000000-0000-0000-0000-00000000fc01', '00000000-0000-0000-0000-00000000fa01', 1, 'running', now() - interval '20 minutes');
select public.requeue_stuck_ai_jobs();
select is((select status from public.ai_jobs where id = '00000000-0000-0000-0000-00000000fc01'), 'queued', 'stuck job re-queued');

update public.ai_jobs set status = 'succeeded', input_reason_count = 7 where id = '00000000-0000-0000-0000-00000000fc01';
select is((select reason_count from public.poll_results where poll_id = '00000000-0000-0000-0000-00000000fa01'), 7, 'reason count stored with the summary');
select is((public.result_payload('00000000-0000-0000-0000-00000000fa01', null, true)->>'reason_count')::int, 7, 'payload uses stored count');

select * from finish();
rollback;
