-- pgTAP: run with `supabase test db`.
begin;
select plan(4);

select is_empty('select * from public.tables_without_rls()', 'every public table has RLS enabled');

-- New auth user gets a profile with an internal handle.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'a@test.dev');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'b@test.dev');
select matches(
  (select handle from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  '^u_[a-z0-9]{6}$', 'profile created with handle');

-- A signed-in user sees only their own profile.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
select results_eq('select count(*)::int from public.profiles', array[1], 'user sees only own profile');

-- Anonymous users see nothing.
reset role;
set local role anon;
select throws_ok('select id from public.profiles', '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
