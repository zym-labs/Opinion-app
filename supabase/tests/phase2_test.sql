-- pgTAP: close friends circle, public result pages, voter reputation.
begin;
select plan(10);

insert into public.categories (slug, name) values ('q-tech', 'Q Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((800 + i)::text, 12, '0'))::uuid, 'q' || i || '@test.dev'
from generate_series(1, 4) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((800 + i)::text, 12, '0'))::text, true);
end $$;
create function pg_temp.uid(i int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-' || lpad((800 + i)::text, 12, '0'))::uuid
$$;
create function pg_temp.onboard(i int) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = 'q-tech')]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;
select pg_temp.onboard(i) from generate_series(1, 4) i;

-- Circle: friends join by link; the owner sees a count, never names.
select pg_temp.as_user(1);
select set_config('test.circle', (select code from public.my_circle()), true);
select pg_temp.as_user(2);
select lives_ok($$select public.join_circle(current_setting('test.circle'))$$, 'friend joins by link');
select pg_temp.as_user(3);
select public.join_circle(current_setting('test.circle'));
select pg_temp.as_user(1);
select is((select members from public.my_circle()), 2, 'owner sees the count');
select throws_ok($$select public.join_circle(current_setting('test.circle'))$$, 'INVALID_INPUT', 'cannot join your own circle');

-- Friends-only poll goes to the circle automatically.
reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation)
values ('00000000-0000-0000-0000-00000000e801', pg_temp.uid(1), 'expert', 'Circle question?', 6, 'approved');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000e801', 'a', 'A'), ('00000000-0000-0000-0000-00000000e801', 'b', 'B');
select public.publish_poll_internal(pg_temp.uid(1), '00000000-0000-0000-0000-00000000e801', true);
select is((select count(*)::int from public.poll_invitees where poll_id = '00000000-0000-0000-0000-00000000e801'), 2,
  'circle members are invited');
select is((select count(*)::int from public.notifications where type = 'circle_poll'), 2, 'and notified');
set local role authenticated;
select pg_temp.as_user(2);
select is((select count(*)::int from public.get_feed() where id = '00000000-0000-0000-0000-00000000e801'), 1,
  'friend sees it in the feed');

-- Public result: only finished polls with 10+ votes; anonymous readers get no identities.
reset role;
update public.polls set status = 'completed', closes_at = now() - interval '1 hour'
where id = '00000000-0000-0000-0000-00000000e801';
insert into public.poll_results (poll_id, total_votes, winner, pcts, generated_at, summary_majority)
values ('00000000-0000-0000-0000-00000000e801', 12, 'a', '{"a": 75, "b": 25}', now(), 'Most chose A.');
set local role authenticated;
select pg_temp.as_user(1);
select set_config('test.public', public.set_result_public('00000000-0000-0000-0000-00000000e801', true), true);
set local role anon;
select is((public.get_public_result(current_setting('test.public')) ->> 'question'), 'Circle question?', 'anyone can read it');
select ok(not (public.get_public_result(current_setting('test.public')) ? 'poll_id'), 'no internal ids exposed');

-- Reputation: a trusted reporter's report jumps a severity step.
reset role;
insert into public.voter_reputation (user_id, score) values (pg_temp.uid(4), 50);
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000e802', pg_temp.uid(1), 'expert', 'Report me?', 6, 'approved', 'active', now(), now() + interval '6 hours');
set local role authenticated;
select pg_temp.as_user(4);
select public.submit_report('poll', '00000000-0000-0000-0000-00000000e802', 'spam');
reset role;
select is((select severity::int from public.reports where reporter_id = pg_temp.uid(4)), 2, 'trusted report gets priority');
select lives_ok('select public.compute_reputation()', 'nightly reputation job runs');

select * from finish();
rollback;
