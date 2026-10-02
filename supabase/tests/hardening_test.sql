-- pgTAP: security review checks.
begin;
select plan(6);

-- No function is executable by logged-out clients.
select is_empty($$
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not like 'pgtap%'
    -- The public reads: starter poll results, and live-poll link previews (question and labels only). No identities.
    and p.proname not in ('get_starter_polls', 'get_invite_preview')
$$, 'anon can only execute the public reads');

-- Internal functions are not callable by signed-in users.
select ok(not has_function_privilege('authenticated', 'public.cast_vote_internal(uuid,uuid,public.vote_side,text,public.vote_side,boolean,public.moderation_state,jsonb)', 'execute'),
  'cast_vote_internal is service-only');
select ok(not has_function_privilege('authenticated', 'public.claim_ai_jobs(int)', 'execute'), 'claim_ai_jobs is service-only');
select ok(has_function_privilege('authenticated', 'public.get_feed(int,timestamptz,uuid,uuid,int)', 'execute'), 'get_feed is callable');

-- Small audiences are not revealed.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'e1@test.dev');
update public.profiles set onboarding_step = 'complete', birth_year = 1990 where id = '00000000-0000-0000-0000-0000000000e1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1"}';
select is(public.estimate_audience('community', '{}', null, null, (select id from public.communities limit 1)), 0,
  'audiences under 20 read as 0');
select throws_ok($$select public.submit_report('poll', gen_random_uuid(), 'spam')$$, 'NOT_FOUND', 'reports need a real target');

select * from finish();
rollback;
