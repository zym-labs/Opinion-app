-- pgTAP: follow-up polls link to their parent and notify the parent's voters.
begin;
select plan(4);

insert into public.categories (slug, name) values ('tech', 'Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((400 + i)::text, 12, '0'))::uuid, 'f' || i || '@test.dev'
from generate_series(0, 24) i;
update public.profiles set onboarding_step = 'complete', birth_year = 1995
where id::text like '00000000-0000-0000-0000-0000000004%';
insert into public.user_categories (user_id, category_id)
select p.id, (select id from public.categories where slug = 'tech') from public.profiles p
where p.id::text like '00000000-0000-0000-0000-0000000004%';
insert into public.credit_ledger (user_id, delta, reason) values ('00000000-0000-0000-0000-000000000400', 3, 'signup_bonus');

-- Completed parent poll with 3 voters.
insert into public.polls (id, creator_id, type, question, duration_hours, status, moderation, closes_at)
values ('00000000-0000-0000-0000-00000000aa10', '00000000-0000-0000-0000-000000000400', 'expert', 'Parent question?', 6,
  'completed', 'approved', now() - interval '1 hour');
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000aa10', 'a', 'A'), ('00000000-0000-0000-0000-00000000aa10', 'b', 'B');
insert into public.poll_target_categories (poll_id, category_id)
select '00000000-0000-0000-0000-00000000aa10', id from public.categories where slug = 'tech';
insert into public.votes (poll_id, voter_id, side, feature_consent)
select '00000000-0000-0000-0000-00000000aa10', ('00000000-0000-0000-0000-' || lpad((400 + i)::text, 12, '0'))::uuid, 'a', true
from generate_series(1, 3) i;

select public.create_poll_draft('00000000-0000-0000-0000-000000000400', 'expert', false, 'Follow-up question?',
  array['Yes','No'], array[(select id from public.categories where slug = 'tech')]::smallint[], null, null, null, 6::smallint, 'approved');

select throws_ok($$select public.set_follow_up_parent('00000000-0000-0000-0000-000000000401',
  (select id from public.polls where question = 'Follow-up question?'), '00000000-0000-0000-0000-00000000aa10')$$,
  'POLL_NOT_FOUND', 'only the parent''s creator can link a follow-up');
select lives_ok($$select public.set_follow_up_parent('00000000-0000-0000-0000-000000000400',
  (select id from public.polls where question = 'Follow-up question?'), '00000000-0000-0000-0000-00000000aa10')$$,
  'creator links the follow-up');

select public.publish_poll_internal('00000000-0000-0000-0000-000000000400', (select id from public.polls where question = 'Follow-up question?'));
select is((select count(*)::int from public.notifications where type = 'follow_up'), 3, 'parent voters are notified');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000410"}';
select is((select follow_up_of from public.get_feed() where question = 'Follow-up question?'), 'Parent question?',
  'feed shows the parent question');

select * from finish();
rollback;
