-- pgTAP: feed puts polls short of votes first; private stats.
begin;
select plan(4);

insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test.dev'), ('00000000-0000-0000-0000-0000000000f2', 'f2@test.dev');
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2');
insert into public.user_categories (user_id, category_id)
select '00000000-0000-0000-0000-0000000000f2', id from public.categories where slug = 'tech';

-- Busy poll closes first, quiet poll closes later: quiet should still come first.
insert into public.polls (id, creator_id, type, question, duration_hours, status, moderation, published_at, closes_at, vote_count) values
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000000f1', 'expert', 'Busy poll question', 6, 'active', 'approved', now(), now() + interval '1 hour', 25),
  ('00000000-0000-0000-0000-00000000ab02', '00000000-0000-0000-0000-0000000000f1', 'expert', 'Quiet poll question', 6, 'active', 'approved', now(), now() + interval '5 hours', 2);
insert into public.poll_options (poll_id, side, label)
select p, s, s from unnest(array['00000000-0000-0000-0000-00000000ab01','00000000-0000-0000-0000-00000000ab02']::uuid[]) p,
  unnest(array['a','b']::public.vote_side[]) s;
insert into public.poll_target_categories (poll_id, category_id)
select p, (select id from public.categories where slug = 'tech')
from unnest(array['00000000-0000-0000-0000-00000000ab01','00000000-0000-0000-0000-00000000ab02']::uuid[]) p;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2"}';
select is((select question from public.get_feed() limit 1), 'Quiet poll question', 'polls short of votes come first');
select is((select question from public.get_feed(1, now() + interval '5 hours', '00000000-0000-0000-0000-00000000ab02', null, 0)),
  'Busy poll question', 'cursor continues into the next bucket');
select is((select count(*)::int from public.get_poll_for_vote('00000000-0000-0000-0000-00000000ab01')), 1, 'single poll lookup works');
select is((public.my_stats()->>'decided')::int, 0, 'stats include decided count');

select * from finish();
rollback;
