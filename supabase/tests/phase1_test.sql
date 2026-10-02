-- pgTAP: notification budget, daily question, need-more-info, journal check-in, summary flags, vote bursts.
begin;
select plan(14);

insert into public.categories (slug, name) values ('p-tech', 'P Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((700 + i)::text, 12, '0'))::uuid, 'p' || i || '@test.dev'
from generate_series(1, 12) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((700 + i)::text, 12, '0'), 'aal', 'aal2')::text, true);
end $$;
create function pg_temp.uid(i int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-' || lpad((700 + i)::text, 12, '0'))::uuid
$$;
create function pg_temp.onboard(i int) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = 'p-tech')]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;
select pg_temp.onboard(i) from generate_series(1, 12) i;
reset role;
update public.profiles set is_admin = true where id = pg_temp.uid(1);

-- Notification budget: nudges stop at 4 a week; results still go through.
select public.notify(pg_temp.uid(2), 'last_call', null, '{}') from generate_series(1, 6);
select is((select count(*)::int from public.notifications where user_id = pg_temp.uid(2) and type = 'last_call'), 4,
  'nudges capped at 4 per week');
select public.notify(pg_temp.uid(2), 'poll_ended', null, '{}');
select is((select count(*)::int from public.notifications where user_id = pg_temp.uid(2) and type = 'poll_ended'), 1,
  'results are never capped');

-- Daily question: scheduled, activated, open to everyone, kept out of the main feed.
set local role authenticated;
select pg_temp.as_user(1);
select lives_ok($$select public.admin_schedule_daily(current_date, 'Coffee or tea today?', array['Coffee', 'Tea'])$$, 'admin schedules');
reset role;
select public.activate_daily();
set local role authenticated;
select pg_temp.as_user(3);
select is((select question from public.get_daily()), 'Coffee or tea today?', 'daily question is live');
select is((select count(*)::int from public.get_feed() where target_label = 'Today’s question'), 0, 'not duplicated in the feed');
reset role;
select lives_ok($$select public.cast_vote_internal(pg_temp.uid(3), (select id from public.polls where daily_on = current_date),
  'a', null, null, true, 'approved', null)$$, 'anyone can vote on it without a reason');

-- Need more info.
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000d001', pg_temp.uid(2), 'expert', 'Unclear question?', 6, 'approved', 'active',
        now(), now() + interval '6 hours');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000d001', 'a', 'A'), ('00000000-0000-0000-0000-00000000d001', 'b', 'B');
insert into public.poll_target_categories (poll_id, category_id)
values ('00000000-0000-0000-0000-00000000d001', (select id from public.categories where slug = 'p-tech'));
set local role authenticated;
select pg_temp.as_user(4);
select public.request_info('00000000-0000-0000-0000-00000000d001');
select is((select count(*)::int from public.get_feed() where id = '00000000-0000-0000-0000-00000000d001'), 0,
  'asking for info hides the poll for you');
select pg_temp.as_user(5);
select public.request_info('00000000-0000-0000-0000-00000000d001');
select pg_temp.as_user(6);
select public.request_info('00000000-0000-0000-0000-00000000d001');
reset role;
select is((select count(*)::int from public.notifications where user_id = pg_temp.uid(2) and type = 'info_requested'), 1,
  'asker told once at 3 requests');
set local role authenticated;
select pg_temp.as_user(2);
select is(public.poll_info_requests('00000000-0000-0000-0000-00000000d001'), 3, 'asker sees the count');

-- Journal and check-in.
reset role;
update public.polls set status = 'completed', closes_at = now() - interval '40 days', decision_side = 'a',
  decision_none = false, decided_at = now() - interval '35 days' where id = '00000000-0000-0000-0000-00000000d001';
insert into public.poll_results (poll_id, total_votes, winner, pcts, generated_at, summary_majority)
values ('00000000-0000-0000-0000-00000000d001', 12, 'a', '{"a": 75, "b": 25}', now() - interval '40 days', 'Most chose A.');
set local role authenticated;
select pg_temp.as_user(2);
select is((select followed_crowd from public.my_journal()), true, 'journal knows you went with the crowd');
select is((select checkin_due from public.my_journal()), true, '30-day check-in is due');
select public.save_checkin('00000000-0000-0000-0000-00000000d001', true);
select is((select checkin_glad from public.my_journal()), true, 'check-in saved');

-- Summary flags: only people involved can flag.
select lives_ok($$select public.flag_summary('00000000-0000-0000-0000-00000000d001')$$, 'asker can flag the summary');

-- Vote bursts: 8 fresh accounts voting the same way within minutes get flagged.
reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000d002', pg_temp.uid(1), 'expert', 'Burst me?', 6, 'approved', 'active', now(), now() + interval '6 hours');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000d002', 'a', 'A'), ('00000000-0000-0000-0000-00000000d002', 'b', 'B');
insert into public.votes (poll_id, voter_id, side, feature_consent, created_at)
select '00000000-0000-0000-0000-00000000d002', pg_temp.uid(i), 'a', true, date_bin('10 minutes', now(), timestamptz '2026-01-01') + interval '1 minute'
from generate_series(3, 11) i;
select public.detect_vote_bursts();
select is((select votes from public.integrity_flags where poll_id = '00000000-0000-0000-0000-00000000d002'), 9, 'burst flagged for review');

select * from finish();
rollback;
