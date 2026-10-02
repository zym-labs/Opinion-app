-- pgTAP: friends-only polls, invite links, campus lock, referrals.
begin;
select plan(13);

insert into public.categories (slug, name) values ('g-tech', 'G Tech'), ('g-art', 'G Art') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((500 + i)::text, 12, '0'))::uuid, 'g' || i || '@test.dev'
from generate_series(1, 5) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((500 + i)::text, 12, '0'))::text, true);
end $$;

create function pg_temp.onboard(i int, cat text) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = cat)]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;
select pg_temp.onboard(1, 'g-tech');
select pg_temp.onboard(i, 'g-art') from generate_series(2, 5) i;

-- Friends-only poll publishes with a tiny audience and gets a link.
reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation)
values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-000000000501', 'expert', 'Friends only?', 6, 'approved');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000f001', 'a', 'A'), ('00000000-0000-0000-0000-00000000f001', 'b', 'B');
insert into public.poll_target_categories (poll_id, category_id)
values ('00000000-0000-0000-0000-00000000f001', (select id from public.categories where slug = 'g-tech'));

select throws_ok($$select public.publish_poll_internal('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-00000000f001')$$,
  'AUDIENCE_TOO_SMALL', 'public publish still needs 20 people');
select lives_ok($$select public.publish_poll_internal('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-00000000f001', true)$$,
  'friends-only publish skips the minimum');
select isnt((select invite_code from public.polls where id = '00000000-0000-0000-0000-00000000f001'), null, 'friends-only poll has a link');

set local role authenticated;
select pg_temp.as_user(2);
select is((select count(*)::int from public.get_feed()), 0, 'not in feed before opening the link');
select is((select count(*)::int from public.get_invite_preview('nope')), 0, 'unknown code shows nothing');
reset role;
select set_config('test.code', (select invite_code from public.polls where id = '00000000-0000-0000-0000-00000000f001'), true);
set local role authenticated;
select pg_temp.as_user(2);
select is(public.claim_poll_invite(current_setting('test.code')), '00000000-0000-0000-0000-00000000f001'::uuid, 'link claims the poll');
select is((select count(*)::int from public.get_feed()), 1, 'invitee sees it in the feed');

reset role;
select public.cast_vote_internal('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-00000000f001',
  'a', null, null, true, 'approved', null);
select is((select via_invite from public.votes where voter_id = '00000000-0000-0000-0000-000000000502'), true, 'link vote is flagged');
select throws_ok($$select public.cast_vote_internal('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-00000000f001',
  'a', null, null, true, 'approved', null)$$, 'NOT_ELIGIBLE', 'no link, no vote on a friends-only poll');

-- Campus lock.
insert into public.communities (id, slug, name, description, kind, launch_target)
values ('00000000-0000-0000-0000-00000000c001', 'g-campus', 'G Campus', 'Test', 'campus', 300);
select ok(public.community_locked('00000000-0000-0000-0000-00000000c001'), 'campus under its target is locked');

-- Referral: 503 uses 501's code, then casts 3 votes; both earn a poll.
set local role authenticated;
select pg_temp.as_user(1);
select set_config('test.ref', (select code from public.my_referral()), true);
select pg_temp.as_user(3);
select lives_ok($$select public.redeem_referral(current_setting('test.ref'))$$, 'new user redeems a code');
select throws_ok($$select public.redeem_referral(current_setting('test.ref'))$$, 'ALREADY_REFERRED', 'only once');

reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
select ('00000000-0000-0000-0000-00000000f1' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-000000000504',
  'expert', 'Referral poll ' || i, 6, 'approved', 'active', now(), now() + interval '6 hours'
from generate_series(1, 3) i;
insert into public.poll_options (poll_id, side, label)
select ('00000000-0000-0000-0000-00000000f1' || lpad(i::text, 2, '0'))::uuid, s::public.vote_side, upper(s)
from generate_series(1, 3) i, unnest(array['a', 'b']) s;
insert into public.votes (poll_id, voter_id, side, feature_consent)
select ('00000000-0000-0000-0000-00000000f1' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-000000000503', 'a', true
from generate_series(1, 3) i;
select is((select count(*)::int from public.credit_ledger where reason = 'referral'), 2, 'both get credit after 3 votes');

select * from finish();
rollback;
