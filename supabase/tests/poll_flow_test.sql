-- pgTAP: onboarding → poll → votes → close, plus privacy rules. Run with `supabase test db`.
begin;
select plan(16);

-- 25 users: 1 creator + 24 voters, all onboarded into category 'tech'.
insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'u' || i || '@test.dev'
from generate_series(1, 25) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::text, true);
end $$;

create function pg_temp.onboard(i int) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = 'tech')]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;

-- Onboarding
select pg_temp.as_user(1);
select throws_ok($$select public.set_birth_year(2015::smallint)$$, 'AGE_BLOCKED', 'under-18 blocked');
select pg_temp.onboard(i) from generate_series(1, 25) i;
select is((select onboarding_step::text from public.get_me()), 'complete', 'onboarding completes');
select is((select units from public.get_credits()), 3, 'signup bonus = 1 poll');

-- Privacy: clients can't read raw tables
select throws_ok('select * from public.votes', '42501', null, 'votes not readable');
select throws_ok('select * from public.reasons', '42501', null, 'reasons not readable');
select throws_ok('select creator_id from public.polls', '42501', null, 'creator ids not readable');

-- Create + publish (Edge Function path runs as service role)
reset role;
select lives_ok($$
  select public.create_poll_draft('00000000-0000-0000-0000-000000000001', 'expert', false,
    'MacBook or ThinkPad for CS?', array['MacBook', 'ThinkPad'],
    array[(select id from public.categories where slug = 'tech')]::smallint[], null, null, null, 6::smallint, 'approved')
$$, 'draft created');
select lives_ok($$select public.publish_poll_internal('00000000-0000-0000-0000-000000000001',
  (select id from public.polls limit 1))$$, 'poll published with audience >= 20');
select is(public.credit_units('00000000-0000-0000-0000-000000000001'), 0, 'publishing spends credits');

-- Feed visibility
set local role authenticated;
select pg_temp.as_user(2);
select is((select count(*)::int from public.get_feed()), 1, 'voter sees poll in feed');
select pg_temp.as_user(1);
select is((select count(*)::int from public.get_feed()), 0, 'creator does not see own poll');

-- Votes
reset role;
select throws_ok($$select public.cast_vote_internal('00000000-0000-0000-0000-000000000002',
  (select id from public.polls limit 1), 'a', 'too short', null, true, 'approved', null)$$,
  'REASON_TOO_SHORT', 'expert reason needs 20 chars');
select throws_ok($$select public.cast_vote_internal('00000000-0000-0000-0000-000000000001',
  (select id from public.polls limit 1), 'a', 'I am the creator of this poll', null, true, 'approved', null)$$,
  'CANNOT_VOTE_OWN_POLL', 'creator cannot vote');
select public.cast_vote_internal(('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  (select id from public.polls limit 1), case when i % 3 = 0 then 'b' else 'a' end::public.vote_side,
  'Battery life matters most for long lab days', 'a', true, 'approved', null)
from generate_series(2, 13) i;
select throws_ok($$select public.cast_vote_internal('00000000-0000-0000-0000-000000000002',
  (select id from public.polls limit 1), 'b', 'Changing my mind about this one', null, true, 'approved', null)$$,
  'ALREADY_VOTED', 'one vote per user');

-- Close: 12 votes → summarizing with an AI job, results computed in SQL
update public.polls set closes_at = now() - interval '1 second';
select public.close_due_polls();
select is((select status::text from public.polls limit 1), 'summarizing', 'poll moves to summarizing');
select is((select pct_a from public.poll_results limit 1), 66.67::numeric(5,2), 'percentages computed');

select * from finish();
rollback;
