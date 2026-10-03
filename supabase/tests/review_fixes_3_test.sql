-- pgTAP: review fixes 3 (public page leak, sponsored 48h, deletion cleanup).
begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000b01', 'rf3admin@test.dev'),
  ('00000000-0000-0000-0000-000000000b02', 'rf3user@test.dev');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000b01';

insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, closes_at, public_code, reflection, decision_side, decided_at)
values ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-000000000b02', 'expert', 'Leak check?', 6, 'approved',
        'completed', now() - interval '1 hour', 'leakcheck1', '{"ten_years": "private"}', 'a', now());
insert into public.poll_options (poll_id, side, label) values
  ('00000000-0000-0000-0000-00000000bb01', 'a', 'A'), ('00000000-0000-0000-0000-00000000bb01', 'b', 'B');
insert into public.poll_results (poll_id, total_votes, winner, pcts, generated_at, summary_majority, ai_take)
values ('00000000-0000-0000-0000-00000000bb01', 12, 'a', '{"a": 75, "b": 25}', now(), 'Most chose A.', '{"leaning": "A"}');

set local role anon;
select ok(not (public.get_public_result('leakcheck1') ? 'ai_take'), 'public page has no AI second opinion');
reset role;

select lives_ok($$insert into public.polls (creator_id, type, question, duration_hours, moderation, sponsor_name)
  values ('00000000-0000-0000-0000-000000000b01', 'expert', 'Sponsored long?', 48, 'approved', 'Union')$$,
  'sponsored polls can run 48 hours');

select public.prepare_account_deletion('00000000-0000-0000-0000-000000000b02');
select is((select reflection from public.polls where id = '00000000-0000-0000-0000-00000000bb01'), null, 'private notes removed');
select is((select public_code from public.polls where id = '00000000-0000-0000-0000-00000000bb01'), null, 'public page taken down');
select is((select ai_take from public.poll_results where poll_id = '00000000-0000-0000-0000-00000000bb01'), null, 'AI take removed');

select * from finish();
rollback;
