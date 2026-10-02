-- Device integrity (STAGE2 §11): Apple App Attest keys and Play Integrity results, so scripted
-- clients can't farm vote credits. Enforcement is controlled by the INTEGRITY_MODE function secret.

create table public.device_keys (
  user_id     uuid references public.profiles on delete cascade,
  key_id      text not null,
  public_key  text not null,
  sign_count  bigint not null default 0,
  verified_at timestamptz not null default now(),
  primary key (user_id, key_id)
);

create table public.integrity_challenges (
  challenge  text primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  expires_at timestamptz not null default now() + interval '5 minutes'
);

-- Every check outcome, for tuning before enforcement (report mode) and for abuse review.
create table public.integrity_events (
  id         bigserial primary key,
  user_id    uuid references public.profiles on delete set null,
  action     text not null,
  platform   text,
  ok         boolean not null,
  reason     text,
  created_at timestamptz not null default now()
);

alter table public.device_keys enable row level security;
alter table public.integrity_challenges enable row level security;
alter table public.integrity_events enable row level security;
revoke all on public.device_keys, public.integrity_challenges, public.integrity_events from anon, authenticated;
create index on public.integrity_events (created_at desc);

-- One-time challenge for App Attest key registration.
create or replace function public.issue_integrity_challenge()
returns text language plpgsql security definer set search_path = '' as $$
declare c text := encode(extensions.gen_random_bytes(32), 'base64');
begin
  perform public.require_user(false);
  perform public.hit_rate_limit(auth.uid(), 'integrity_challenge', 10, interval '1 hour');
  delete from public.integrity_challenges where expires_at < now();
  insert into public.integrity_challenges (challenge, user_id) values (c, auth.uid());
  return c;
end $$;
revoke execute on function public.issue_integrity_challenge() from public, anon;
grant execute on function public.issue_integrity_challenge() to authenticated;

-- Admin view: failure rate by platform over the last 7 days.
create or replace function public.admin_integrity_summary()
returns table (platform text, action text, checks bigint, failures bigint, top_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select e.platform, e.action, count(*), count(*) filter (where not e.ok),
    (select reason from public.integrity_events x where x.platform is not distinct from e.platform and x.action = e.action
       and not x.ok and x.created_at > now() - interval '7 days' group by reason order by count(*) desc limit 1)
  from public.integrity_events e where e.created_at > now() - interval '7 days'
  group by e.platform, e.action order by 1, 2;
end $$;
revoke execute on function public.admin_integrity_summary() from public, anon;
grant execute on function public.admin_integrity_summary() to authenticated;
