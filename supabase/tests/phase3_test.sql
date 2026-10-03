-- pgTAP: Opinion+ entitlements and perks, Campus Pulse sponsored polls, AI summary language.
begin;
select plan(11);

insert into public.categories (slug, name) values ('s-tech', 'S Tech') on conflict (slug) do nothing;
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad((900 + i)::text, 12, '0'))::uuid, 's' || i || '@test.dev'
from generate_series(1, 4) i;

create function pg_temp.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-' || lpad((900 + i)::text, 12, '0'), 'aal', 'aal2')::text, true);
end $$;
create function pg_temp.uid(i int) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-' || lpad((900 + i)::text, 12, '0'))::uuid
$$;
create function pg_temp.onboard(i int) returns void language plpgsql as $$
begin
  perform pg_temp.as_user(i);
  perform public.set_birth_year((2026 - 25)::smallint);
  perform public.accept_terms('1.0');
  perform public.set_categories(array[(select id from public.categories where slug = 's-tech')]::smallint[]);
  perform public.complete_onboarding();
end $$;

set local role authenticated;
select pg_temp.onboard(i) from generate_series(1, 4) i;
reset role;
update public.profiles set is_admin = true where id = pg_temp.uid(1);

-- Opinion+: only the webhook (service role) can grant it.
set local role authenticated;
select pg_temp.as_user(2);
select throws_ok($$select public.set_subscription(pg_temp.uid(2), 'plus', true, now() + interval '30 days', 'app_store')$$,
  '42501', null, 'users cannot grant themselves Opinion+');
select is((select active from public.my_plus()), false, 'not a member yet');
reset role;
select public.set_subscription(pg_temp.uid(2), 'plus', true, now() + interval '30 days', 'app_store');
set local role authenticated;
select pg_temp.as_user(2);
select is((select boosts_left from public.my_plus()), 2, 'members get 2 free boosts a month');

-- 48-hour polls need Opinion+.
reset role;
select lives_ok($$insert into public.polls (creator_id, type, question, duration_hours, moderation)
  values (pg_temp.uid(2), 'expert', 'Long member poll?', 48, 'approved')$$, 'members can run 48-hour polls');
select throws_ok($$insert into public.polls (creator_id, type, question, duration_hours, moderation)
  values (pg_temp.uid(3), 'expert', 'Long free poll?', 48, 'approved')$$, 'PLUS_REQUIRED', 'others cannot');

-- Free boost does not spend credits.
insert into public.polls (id, creator_id, type, question, duration_hours, moderation, status, published_at, closes_at)
values ('00000000-0000-0000-0000-00000000f901', pg_temp.uid(2), 'expert', 'Boost me free?', 6, 'approved', 'active', now(), now() + interval '6 hours');
set local role authenticated;
select pg_temp.as_user(2);
select public.boost_poll('00000000-0000-0000-0000-00000000f901');
reset role;
select is(public.credit_units(pg_temp.uid(2)), 3, 'free boost keeps credits');

-- Campus Pulse: labelled, opt-in only, extra credit for voters.
set local role authenticated;
select pg_temp.as_user(1);
select set_config('test.sp', public.admin_create_sponsored_poll('Student Union', 'Late library hours?', array['Yes', 'No'],
  12::smallint, null, (select id from public.categories where slug = 's-tech'))::text, true);
select pg_temp.as_user(3);
select is((select count(*)::int from public.get_feed() where id = current_setting('test.sp')::uuid), 0, 'hidden until you opt in');
select public.set_sponsored_opt_in(true);
select is((select target_label from public.get_feed() where id = current_setting('test.sp')::uuid), 'Sponsored · Student Union',
  'shown with the sponsor label after opting in');
reset role;
select public.cast_vote_internal(pg_temp.uid(3), current_setting('test.sp')::uuid, 'a', null, null, true, 'approved', null);
select is((select delta::int from public.credit_ledger where user_id = pg_temp.uid(3) and reason = 'sponsored'), 2,
  'voters get 2 extra credit units');

-- Language reaches the AI job.
set local role authenticated;
select pg_temp.as_user(4);
select public.set_locale('es');
reset role;
select is((select locale from public.profiles where id = pg_temp.uid(4)), 'es', 'locale saved');
set local role authenticated;
select throws_ok($$select public.set_locale('xx_bad')$$, 'INVALID_INPUT', 'bad locale rejected');

select * from finish();
rollback;
