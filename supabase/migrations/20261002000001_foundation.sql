-- Phase 1 foundation: enums (STAGE3 §3), profiles, consents, RLS default deny.

create extension if not exists pgcrypto;

create type public.account_status   as enum ('active','suspended','deleted');
create type public.onboarding_step  as enum ('signed_in','age_verified','terms_accepted','categories_chosen','communities_done','complete');
create type public.age_source       as enum ('self','store_signal');
create type public.poll_type        as enum ('expert','community');
create type public.poll_status      as enum ('draft','active','closing','summarizing','completed','failed_ai','removed','deleted');
create type public.moderation_state as enum ('pending','approved','rejected');
create type public.vote_side        as enum ('a','b');
create type public.community_kind   as enum ('topic','campus');
create type public.report_target    as enum ('poll','reason','featured_insight');
create type public.report_reason    as enum ('spam','hate','harassment','personal_info','sexual','self_harm','other');
create type public.report_status    as enum ('open','actioned','dismissed');
create type public.credit_reason    as enum ('signup_bonus','vote','poll_publish','poll_refund','admin_adjust');
create type public.notif_type       as enum ('new_polls_digest','poll_ended','summary_ready','insight_featured','moderation_outcome');

create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  handle                text unique not null,
  status                public.account_status not null default 'active',
  onboarding_step       public.onboarding_step not null default 'signed_in',
  birth_year            smallint,
  age_source            public.age_source,
  age_checked_at        timestamptz,
  categories_changed_at timestamptz,
  is_admin              boolean not null default false,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles on delete set null,
  kind        text not null check (kind in ('terms','privacy','guidelines')),
  version     text not null,
  accepted_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.consents enable row level security;

-- Clients read only their own profile, and only safe columns (no handle, no is_admin).
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
revoke all on public.profiles from anon, authenticated;
grant select (id, status, onboarding_step, birth_year, created_at) on public.profiles to authenticated;
revoke all on public.consents from anon, authenticated;

-- Internal handle like u_8f3k2q, never shown to other users.
create or replace function public.generate_handle() returns text
language plpgsql as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  candidate text;
begin
  loop
    candidate := 'u_';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where handle = candidate);
  end loop;
  return candidate;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, handle) values (new.id, public.generate_handle());
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- CI guard: lists public tables without RLS. Must return no rows.
create or replace function public.tables_without_rls() returns setof text
language sql stable security definer set search_path = '' as $$
  select c.relname::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
$$;
revoke all on function public.tables_without_rls() from anon, authenticated, public;
