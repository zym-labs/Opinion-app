-- pgTAP: helpful reactions, browse by category, boost.
begin;
select plan(10);

insert into public.categories (slug, name) values ('e-tech', 'E Tech'), ('e-art', 'E Art') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((600 + i)::text, 12, '0'))::uuid, 'e' || i || '@test.dev'
from generate_series(1, 24) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((600 + i)::text, 12, '0'))::text, true);
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
select pg_temp.onboard(i, 'e-tech') from generate_series(1, 23) i;
select pg_temp.onboard(24, 'e-art');

reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-000000000601', 'expert', 'Browse me?', 6,
        'approved', 'active', now(), now() + interval '6 hours');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000e001', 'a', 'A'), ('00000000-0000-0000-0000-00000000e001', 'b', 'B');
insert into public.poll_target_categories (poll_id, category_id)
values ('00000000-0000-0000-0000-00000000e001', (select id from public.categories where slug = 'e-tech'));

-- Browse
set local role authenticated;
select pg_temp.as_user(2);
select is((select can_vote from public.browse_polls((select id from public.categories where slug = 'e-tech'))), true,
  'member of the category can vote');
select pg_temp.as_user(24);
select is((select can_vote from public.browse_polls((select id from public.categories where slug = 'e-tech'))), false,
  'others can browse but not vote');
select pg_temp.as_user(1);
select is((select count(*)::int from public.browse_polls((select id from public.categories where slug = 'e-tech'))), 0,
  'creator does not see own poll');

-- Boost: spends a poll credit and notifies eligible non-voters, once.
select is(public.boost_poll('00000000-0000-0000-0000-00000000e001'), 22, 'boost notifies the eligible audience');
select throws_ok($$select public.boost_poll('00000000-0000-0000-0000-00000000e001')$$, 'ALREADY_BOOSTED', 'once per poll');
reset role;
select is(public.credit_units('00000000-0000-0000-0000-000000000601'), 0, 'boost spends credit');

-- Helpful reactions
insert into public.votes (id, poll_id, voter_id, side, feature_consent) values
  ('00000000-0000-0000-0000-00000000e101', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-000000000602', 'a', true),
  ('00000000-0000-0000-0000-00000000e102', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-000000000603', 'b', true);
insert into public.reasons (vote_id, body, moderation) values ('00000000-0000-0000-0000-00000000e101', 'Because A is lighter.', 'approved');
insert into public.poll_results (poll_id, total_votes, generated_at)
values ('00000000-0000-0000-0000-00000000e001', 2, now());
insert into public.featured_insights (id, poll_id, reason_vote_id, quote, side, rank)
values ('00000000-0000-0000-0000-00000000e201', '00000000-0000-0000-0000-00000000e001',
        '00000000-0000-0000-0000-00000000e101', 'Because A is lighter.', 'a', 1);

set local role authenticated;
select pg_temp.as_user(3);
select lives_ok($$select public.mark_insight_helpful('00000000-0000-0000-0000-00000000e201')$$, 'a voter marks it helpful');
select pg_temp.as_user(2);
select throws_ok($$select public.mark_insight_helpful('00000000-0000-0000-0000-00000000e201')$$, 'NOT_ELIGIBLE', 'not your own quote');
select pg_temp.as_user(24);
select throws_ok($$select public.mark_insight_helpful('00000000-0000-0000-0000-00000000e201')$$, 'NOT_ELIGIBLE', 'only people who voted');
select pg_temp.as_user(2);
select is((select helpful from public.my_featured_insights()), 1, 'author sees the helpful count');

select * from finish();
rollback;
