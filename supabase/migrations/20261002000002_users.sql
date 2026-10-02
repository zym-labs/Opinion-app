-- Phase 2: user system (STAGE3 §4 Users, STAGE2 §3–5).

create table public.categories (
  id           smallserial primary key,
  slug         text unique not null,
  name         text not null,
  is_sensitive boolean not null default false,
  archived     boolean not null default false,
  sort         smallint not null default 0
);

create table public.user_categories (
  user_id     uuid references public.profiles on delete cascade,
  category_id smallint references public.categories,
  primary key (user_id, category_id)
);

create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text not null default '',
  kind        public.community_kind not null default 'topic',
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.community_domains (
  community_id uuid references public.communities on delete cascade,
  domain       text not null,
  primary key (community_id, domain)
);

create table public.campus_verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  community_id uuid not null references public.communities on delete cascade,
  email_hash   text unique not null,
  domain       text not null,
  verified_at  timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '12 months'
);

create table public.campus_codes (
  user_id      uuid references public.profiles on delete cascade,
  community_id uuid references public.communities on delete cascade,
  email_hash   text not null,
  domain       text not null,
  code_hash    text not null,
  attempts     smallint not null default 0,
  expires_at   timestamptz not null,
  primary key (user_id, community_id)
);

create table public.user_communities (
  user_id      uuid references public.profiles on delete cascade,
  community_id uuid references public.communities on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (user_id, community_id)
);

create table public.devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  platform     text not null check (platform in ('ios','android','web')),
  push_token   text unique not null,
  last_seen_at timestamptz not null default now()
);

create table public.notification_prefs (
  user_id          uuid primary key references public.profiles on delete cascade,
  new_polls        boolean not null default true,
  poll_ended       boolean not null default true,
  summary_ready    boolean not null default true,
  insight_featured boolean not null default true,
  digest_hour      smallint not null default 18 check (digest_hour between 0 and 23),
  tz               text not null default 'UTC'
);

alter table public.categories enable row level security;
alter table public.user_categories enable row level security;
alter table public.communities enable row level security;
alter table public.community_domains enable row level security;
alter table public.campus_verifications enable row level security;
alter table public.campus_codes enable row level security;
alter table public.user_communities enable row level security;
alter table public.devices enable row level security;
alter table public.notification_prefs enable row level security;

create policy "read categories" on public.categories for select to authenticated using (not archived);
create policy "read communities" on public.communities for select to authenticated using (not archived);
create policy "own categories" on public.user_categories for select to authenticated using (user_id = auth.uid());
create policy "own communities" on public.user_communities for select to authenticated using (user_id = auth.uid());
create policy "own prefs" on public.notification_prefs for select to authenticated using (user_id = auth.uid());

grant select on public.categories, public.communities to authenticated;
grant select on public.user_categories, public.user_communities, public.notification_prefs to authenticated;
revoke all on public.community_domains, public.campus_verifications, public.campus_codes, public.devices
  from anon, authenticated;

-- Helpers ------------------------------------------------------------------

-- Raises unless the caller is an active user. Pass require_complete to also require onboarding.
create or replace function public.require_user(require_complete boolean default true)
returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'UNAUTHENTICATED' using errcode = 'P0001'; end if;
  if p.status <> 'active' then raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001'; end if;
  if require_complete and p.onboarding_step <> 'complete' then
    raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001';
  end if;
  return p;
end $$;

create or replace function public.advance_onboarding(target public.onboarding_step)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set onboarding_step = target
  where id = auth.uid() and onboarding_step < target;
$$;

-- Onboarding RPCs (STAGE4 §3.1) -------------------------------------------

-- Birth year from the client; the Edge Function handles store age signals and under-18 deletion.
create or replace function public.set_birth_year(p_birth_year smallint, p_source public.age_source default 'self')
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user(false);
  if extract(year from now())::int - p_birth_year < 18 then
    raise exception 'AGE_BLOCKED' using errcode = 'P0001';
  end if;
  update public.profiles
  set birth_year = p_birth_year, age_source = p_source, age_checked_at = now()
  where id = auth.uid() and birth_year is null;
  perform public.advance_onboarding('age_verified');
end $$;

create or replace function public.accept_terms(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := public.require_user(false);
  if p.birth_year is null then raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001'; end if;
  insert into public.consents (user_id, kind, version)
  values (p.id, 'terms', p_version), (p.id, 'privacy', p_version), (p.id, 'guidelines', p_version);
  perform public.advance_onboarding('terms_accepted');
end $$;

create or replace function public.set_categories(p_ids smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  n int := coalesce(array_length(p_ids, 1), 0);
begin
  p := public.require_user(false);
  if p.onboarding_step < 'terms_accepted' then raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001'; end if;
  if n < 1 or n > 5 then raise exception 'CATEGORY_LIMIT' using errcode = 'P0001'; end if;
  if p.onboarding_step = 'complete' and p.categories_changed_at > now() - interval '7 days' then
    raise exception 'CATEGORY_COOLDOWN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.categories where id = any(p_ids) and not archived) <> n then
    raise exception 'CATEGORY_LIMIT' using errcode = 'P0001';
  end if;
  delete from public.user_categories where user_id = p.id;
  insert into public.user_categories (user_id, category_id) select p.id, unnest(p_ids);
  update public.profiles
  set categories_changed_at = case when onboarding_step = 'complete' then now() else categories_changed_at end
  where id = p.id;
  perform public.advance_onboarding('categories_chosen');
end $$;

create or replace function public.join_community(p_community uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  c public.communities;
begin
  p := public.require_user(false);
  select * into c from public.communities where id = p_community and not archived;
  if c.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if c.kind = 'campus' and not exists (
    select 1 from public.campus_verifications
    where user_id = p.id and community_id = c.id and expires_at > now()
  ) then
    raise exception 'CAMPUS_VERIFICATION_REQUIRED' using errcode = 'P0001';
  end if;
  insert into public.user_communities (user_id, community_id) values (p.id, c.id) on conflict do nothing;
end $$;

create or replace function public.leave_community(p_community uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user(false);
  delete from public.user_communities where user_id = auth.uid() and community_id = p_community;
end $$;

create or replace function public.complete_onboarding()
returns void language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := public.require_user(false);
  if p.onboarding_step < 'categories_chosen' then raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001'; end if;
  update public.profiles set onboarding_step = 'complete' where id = p.id;
  insert into public.notification_prefs (user_id) values (p.id) on conflict do nothing;
end $$;

create or replace function public.register_device(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user(false);
  insert into public.devices (user_id, platform, push_token) values (auth.uid(), p_platform, p_token)
  on conflict (push_token) do update set user_id = excluded.user_id, last_seen_at = now();
end $$;

create or replace function public.update_notification_prefs(
  p_new_polls boolean, p_poll_ended boolean, p_summary_ready boolean, p_insight_featured boolean,
  p_digest_hour smallint, p_tz text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  insert into public.notification_prefs as n
    (user_id, new_polls, poll_ended, summary_ready, insight_featured, digest_hour, tz)
  values (auth.uid(), p_new_polls, p_poll_ended, p_summary_ready, p_insight_featured, p_digest_hour, p_tz)
  on conflict (user_id) do update set
    new_polls = excluded.new_polls, poll_ended = excluded.poll_ended,
    summary_ready = excluded.summary_ready, insight_featured = excluded.insight_featured,
    digest_hour = excluded.digest_hour, tz = excluded.tz;
end $$;

-- Safe view of the caller's own profile for the app.
create or replace function public.get_me()
returns table (onboarding_step public.onboarding_step, birth_year smallint, status public.account_status,
               category_ids smallint[], community_ids uuid[], categories_changed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.onboarding_step, p.birth_year, p.status,
    coalesce((select array_agg(category_id) from public.user_categories where user_id = p.id), '{}'),
    coalesce((select array_agg(community_id) from public.user_communities where user_id = p.id), '{}'),
    p.categories_changed_at
  from public.profiles p where p.id = auth.uid();
$$;

revoke execute on function public.require_user(boolean), public.advance_onboarding(public.onboarding_step)
  from public, anon, authenticated;
