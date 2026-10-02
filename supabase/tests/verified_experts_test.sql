-- pgTAP: verified expert votes and the k-anonymous breakdown.
begin;
select plan(4);

insert into public.categories (slug, name) values ('medicine', 'Medicine') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((200 + i)::text, 12, '0'))::uuid, 'v' || i || '@test.dev'
from generate_series(1, 12) i;
update public.profiles set onboarding_step = 'complete', birth_year = 1990
where id::text like '00000000-0000-0000-0000-0000000002%';

insert into public.polls (id, type, question, duration_hours, status, moderation, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000e001', 'expert', 'Night shifts: 3 long or 5 short?', 6, 'active', 'approved', now(), now() + interval '1 hour');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000e001', 'a', '3 long'), ('00000000-0000-0000-0000-00000000e001', 'b', '5 short');
insert into public.poll_target_categories (poll_id, category_id)
select '00000000-0000-0000-0000-00000000e001', id from public.categories where slug = 'medicine';

-- Users 201-206 are verified for Medicine; 207-212 are not.
insert into public.expert_verifications (user_id, category_id, email_hash, domain)
select ('00000000-0000-0000-0000-' || lpad((200 + i)::text, 12, '0'))::uuid, (select id from public.categories where slug = 'medicine'),
  'hash' || i, 'nhs.net'
from generate_series(1, 6) i;

insert into public.votes (poll_id, voter_id, side, feature_consent)
select '00000000-0000-0000-0000-00000000e001', ('00000000-0000-0000-0000-' || lpad((200 + i)::text, 12, '0'))::uuid,
  (case when i <= 5 then 'a' else 'b' end)::public.vote_side, true
from generate_series(1, 12) i;

select is((select count(*)::int from public.votes where poll_id = '00000000-0000-0000-0000-00000000e001' and verified_expert), 6,
  'votes from verified experts are marked');
select is((public.verified_breakdown('00000000-0000-0000-0000-00000000e001')->>'total')::int, 6, 'breakdown counts verified votes');
select is((public.verified_breakdown('00000000-0000-0000-0000-00000000e001')->'pcts'->>'a')::numeric, 83.3, 'verified split per option');

delete from public.votes where poll_id = '00000000-0000-0000-0000-00000000e001' and voter_id::text in
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202');
select is(public.verified_breakdown('00000000-0000-0000-0000-00000000e001'), null, 'hidden below 5 verified votes');

select * from finish();
rollback;
