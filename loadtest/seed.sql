-- STAGING ONLY. 1,000 active Tech polls for the load test (STAGE7 Phase 7: "1k polls closing at once").
-- Run in the SQL editor before loadtest/votes.js. Set closes_at to now() + 10 minutes to also test the closer.
insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;

with p as (
  insert into public.polls (type, question, duration_hours, status, moderation, published_at, closes_at)
  select 'expert', 'Load test poll #' || g, 3, 'active', 'approved', now(), now() + interval '30 minutes'
  from generate_series(1, 1000) g
  returning id
), o as (
  insert into public.poll_options (poll_id, side, label)
  select id, s, upper(s::text) from p, unnest(array['a','b']::public.vote_side[]) s
)
insert into public.poll_target_categories (poll_id, category_id)
select id, (select id from public.categories where slug = 'tech') from p;
