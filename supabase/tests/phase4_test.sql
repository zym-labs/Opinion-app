-- pgTAP: bridging quotes, decision areas, reflection notes, impact, privacy summary, rooms, sponsored cap,
-- transparency stats.
begin;
select plan(15);

insert into public.categories (slug, name) values ('r-tech', 'R Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((950 + i)::text, 12, '0'))::uuid, 'r' || i || '@test.dev'
from generate_series(1, 6) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((950 + i)::text, 12, '0'), 'aal', 'aal2')::text, true);
end $$;
create function pg_temp.uid(i int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-' || lpad((950 + i)::text, 12, '0'))::uuid
$$;
create function pg_temp.onboard(i int) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = 'r-tech')]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;
select pg_temp.onboard(i) from generate_series(1, 6) i;

-- Decision areas
select pg_temp.as_user(1);
select lives_ok($$select public.set_decision_areas(array['career', 'study'])$$, 'areas saved');
select throws_ok($$select public.set_decision_areas(array['astrology'])$$, 'INVALID_INPUT', 'unknown areas rejected');

-- Bridging: a quote helpful to both sides comes first.
reset role;
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, closes_at)
values ('00000000-0000-0000-0000-00000000b001', pg_temp.uid(1), 'expert', 'Bridge me?', 6, 'approved', 'completed', now() - interval '1 hour');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000b001', 'a', 'A'), ('00000000-0000-0000-0000-00000000b001', 'b', 'B');
insert into public.votes (id, poll_id, voter_id, side, feature_consent)
select ('00000000-0000-0000-0000-0000000b1' || lpad(i::text, 3, '0'))::uuid, '00000000-0000-0000-0000-00000000b001',
  pg_temp.uid(i), case when i <= 3 then 'a' else 'b' end::public.vote_side, true
from generate_series(2, 6) i;
insert into public.reasons (vote_id, body, moderation) values
  ('00000000-0000-0000-0000-0000000b1002', 'Popular with A only', 'approved'),
  ('00000000-0000-0000-0000-0000000b1003', 'Fair point both sides see', 'approved');
insert into public.poll_results (poll_id, total_votes, winner, pcts, generated_at, summary_majority)
values ('00000000-0000-0000-0000-00000000b001', 12, 'a', '{"a": 60, "b": 40}', now(), 'Most chose A.');
insert into public.featured_insights (id, poll_id, reason_vote_id, quote, side, rank) values
  ('00000000-0000-0000-0000-0000000bf001', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000b1002', 'Popular with A only', 'a', 1),
  ('00000000-0000-0000-0000-0000000bf002', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000b1003', 'Fair point both sides see', 'a', 2);
-- quote 1: helpful to A voters only; quote 2: helpful to two A and two B voters
insert into public.insight_reactions (insight_id, user_id) values
  ('00000000-0000-0000-0000-0000000bf001', pg_temp.uid(3)), ('00000000-0000-0000-0000-0000000bf001', pg_temp.uid(1)),
  ('00000000-0000-0000-0000-0000000bf002', pg_temp.uid(2)), ('00000000-0000-0000-0000-0000000bf002', pg_temp.uid(3)),
  ('00000000-0000-0000-0000-0000000bf002', pg_temp.uid(4)),
  ('00000000-0000-0000-0000-0000000bf002', pg_temp.uid(5));
select is((public.result_payload('00000000-0000-0000-0000-00000000b001', null, true) -> 'featured' -> 0 ->> 'quote'),
  'Fair point both sides see', 'quote helpful across sides comes first');
select is((public.result_payload('00000000-0000-0000-0000-00000000b001', null, true) -> 'featured' -> 0 ->> 'bridging'),
  'true', 'and is marked as bridging');

-- Reflection notes stay with the asker.
set local role authenticated;
select pg_temp.as_user(1);
select public.save_reflection('00000000-0000-0000-0000-00000000b001', '{"ten_minutes": "relieved"}');
select is((select reflection ->> 'ten_minutes' from public.my_journal()), 'relieved', 'notes appear in the journal');
select pg_temp.as_user(2);
select throws_ok($$select public.save_reflection('00000000-0000-0000-0000-00000000b001', '{}')$$, 'POLL_NOT_FOUND', 'only the asker');

-- Impact and privacy summary
select is((select total_votes from public.my_impact(30)), 1, 'impact counts your votes');
select is((public.my_data_summary() ->> 'votes')::int, 1, 'privacy summary counts votes');

-- Rooms: results only once revealed and with 3+ votes.
reset role;
select set_config('test.room', public.create_room_internal(pg_temp.uid(1), 'Pizza or tacos?', array['Pizza', 'Tacos'], 30), true);
set local role authenticated;
select pg_temp.as_user(2);
select public.join_room(current_setting('test.room'));
select public.vote_room(current_setting('test.room'), 1::smallint);
select throws_ok($$select public.vote_room(current_setting('test.room'), 2::smallint)$$, 'ALREADY_VOTED', 'one vote each');
select pg_temp.as_user(1);
select public.vote_room(current_setting('test.room'), 2::smallint);
select public.reveal_room(current_setting('test.room'));
select is(public.room_state(current_setting('test.room')) -> 'counts', 'null'::jsonb, 'fewer than 3 votes: no counts even when revealed');
reset role;
update public.rooms set revealed = false where code = current_setting('test.room');
set local role authenticated;
select pg_temp.as_user(3);
select public.join_room(current_setting('test.room'));
select public.vote_room(current_setting('test.room'), 1::smallint);
select pg_temp.as_user(1);
select public.reveal_room(current_setting('test.room'));
select is(public.room_state(current_setting('test.room')) -> 'counts', '[2, 1]'::jsonb, 'counts shown at 3 votes');
select pg_temp.as_user(6);
select throws_ok($$select public.room_state(current_setting('test.room'))$$, 'NOT_FOUND', 'only people in the room see it');

-- Sponsored cap: after answering one, no more that week.
reset role;
update public.profiles set sponsored_opt_in = true where id = pg_temp.uid(4);
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at, sponsor_name) values
  ('00000000-0000-0000-0000-00000000b101', pg_temp.uid(1), 'expert', 'Sponsored one?', 6, 'approved', 'active', now(), now() + interval '6 hours', 'Club'),
  ('00000000-0000-0000-0000-00000000b102', pg_temp.uid(1), 'expert', 'Sponsored two?', 6, 'approved', 'active', now(), now() + interval '6 hours', 'Club');
insert into public.poll_target_categories (poll_id, category_id)
select x, (select id from public.categories where slug = 'r-tech')
from unnest(array['00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-00000000b102']::uuid[]) x;
insert into public.poll_options (poll_id, side, label)
select x, s::public.vote_side, upper(s) from unnest(array['00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-00000000b102']::uuid[]) x,
  unnest(array['a', 'b']) s;
set local role authenticated;
select pg_temp.as_user(4);
select is((select count(*)::int from public.get_feed() where target_label like 'Sponsored%'), 2, 'opted in: sponsored shown');
reset role;
insert into public.votes (poll_id, voter_id, side, feature_consent) values ('00000000-0000-0000-0000-00000000b101', pg_temp.uid(4), 'a', true);
set local role authenticated;
select pg_temp.as_user(4);
select is((select count(*)::int from public.get_feed() where target_label like 'Sponsored%'), 0, 'one sponsored question a week');

-- Transparency report is public.
set local role anon;
select ok((public.public_transparency_stats() ? 'reports'), 'transparency stats readable by anyone');

select * from finish();
rollback;
