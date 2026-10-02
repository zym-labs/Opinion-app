-- Verified experts (roadmap; Blind model): a voter proves a professional or academic email domain
-- for a category. Only a hash of the address is kept. Results show how verified experts voted,
-- as aggregates only and only when at least 5 verified experts voted.

create table public.expert_domains (
  category_id smallint references public.categories on delete cascade,
  domain      text not null,
  label       text not null default '',   -- e.g. "NHS staff", shown to the user
  primary key (category_id, domain)
);

create table public.expert_verifications (
  user_id     uuid references public.profiles on delete cascade,
  category_id smallint references public.categories on delete cascade,
  email_hash  text not null,
  domain      text not null,
  verified_at timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '12 months',
  primary key (user_id, category_id),
  unique (category_id, email_hash)        -- one address verifies one account per category
);

create table public.expert_codes (
  user_id     uuid references public.profiles on delete cascade,
  category_id smallint references public.categories on delete cascade,
  email_hash  text not null,
  domain      text not null,
  code_hash   text not null,
  attempts    smallint not null default 0,
  expires_at  timestamptz not null,
  primary key (user_id, category_id)
);

alter table public.expert_domains enable row level security;
alter table public.expert_verifications enable row level security;
alter table public.expert_codes enable row level security;
revoke all on public.expert_domains, public.expert_verifications, public.expert_codes from anon, authenticated;

-- Each vote records whether the voter was a verified expert in one of the poll's categories at the time.
alter table public.votes add column verified_expert boolean not null default false;

create or replace function public.mark_verified_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.verified_expert := exists (
    select 1 from public.expert_verifications e
    join public.poll_target_categories t on t.category_id = e.category_id and t.poll_id = new.poll_id
    where e.user_id = new.voter_id and e.expires_at > now());
  return new;
end $$;
revoke execute on function public.mark_verified_vote() from public, anon, authenticated;
create trigger mark_verified_vote before insert on public.votes
  for each row execute function public.mark_verified_vote();

-- Verified-expert breakdown for a poll; null below 5 verified votes (k-anonymity).
create or replace function public.verified_breakdown(p_poll uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as (select side from public.votes where poll_id = p_poll and verified_expert)
  select case when (select count(*) from v) < 5 then null else jsonb_build_object(
    'total', (select count(*) from v),
    'pcts', (select jsonb_object_agg(o.side, round(100.0 * (select count(*) from v where v.side = o.side) / (select count(*) from v), 1))
             from public.poll_options o where o.poll_id = p_poll)) end;
$$;
revoke execute on function public.verified_breakdown(uuid) from public, anon, authenticated;

-- Attach the breakdown to every result payload (voters, creators, starter polls).
create or replace function public.get_result(p_poll uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare rv public.result_views;
begin
  perform public.require_user();
  select * into rv from public.result_views where poll_id = p_poll and user_id = auth.uid();
  if rv.poll_id is null then raise exception 'RESULT_NOT_READY' using errcode = 'P0001'; end if;
  if exists (select 1 from public.polls where id = p_poll and status = 'removed') then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if rv.viewed_at is not null then
    return jsonb_build_object('state', 'already_viewed', 'poll_id', p_poll,
      'question', (select question from public.polls where id = p_poll),
      'you', jsonb_build_object('in_majority', rv.in_majority, 'predicted_correctly', rv.predicted_correctly));
  end if;
  update public.result_views set first_opened_at = coalesce(first_opened_at, now())
  where poll_id = p_poll and user_id = auth.uid();
  return public.result_payload(p_poll, auth.uid(), false)
    || jsonb_build_object('verified', public.verified_breakdown(p_poll));
end $$;

create or replace function public.get_my_poll_result(p_poll uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not exists (select 1 from public.polls where id = p_poll and creator_id = auth.uid()) then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.result_payload(p_poll, auth.uid(), true)
    || jsonb_build_object('verified', public.verified_breakdown(p_poll));
end $$;

-- What the app shows in Settings → Verify expertise.
create or replace function public.my_expert_options()
returns table (category_id smallint, name text, domains jsonb, verified_until timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select c.id, c.name,
    (select jsonb_agg(jsonb_build_object('domain', d.domain, 'label', d.label)) from public.expert_domains d where d.category_id = c.id),
    (select e.expires_at from public.expert_verifications e where e.user_id = auth.uid() and e.category_id = c.id and e.expires_at > now())
  from public.user_categories uc join public.categories c on c.id = uc.category_id
  where uc.user_id = auth.uid() and exists (select 1 from public.expert_domains d where d.category_id = c.id)
  order by c.sort;
end $$;
revoke execute on function public.my_expert_options() from public, anon;
grant execute on function public.my_expert_options() to authenticated;

-- Admin: manage verifiable domains per category.
create or replace function public.admin_expert_domains()
returns table (category_id smallint, category text, domain text, label text, verified_users bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select d.category_id, c.name, d.domain, d.label,
    (select count(*) from public.expert_verifications e where e.category_id = d.category_id and e.domain = d.domain and e.expires_at > now())
  from public.expert_domains d join public.categories c on c.id = d.category_id
  order by c.sort, d.domain;
end $$;

create or replace function public.admin_set_expert_domain(p_category smallint, p_domain text, p_label text, p_remove boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_remove then
    delete from public.expert_domains where category_id = p_category and domain = lower(trim(p_domain));
  else
    insert into public.expert_domains (category_id, domain, label) values (p_category, lower(trim(p_domain)), p_label)
    on conflict (category_id, domain) do update set label = excluded.label;
  end if;
end $$;
revoke execute on function public.admin_expert_domains(), public.admin_set_expert_domain(smallint, text, text, boolean) from public, anon;
grant execute on function public.admin_expert_domains(), public.admin_set_expert_domain(smallint, text, text, boolean) to authenticated;

-- Retention: expired verifications and codes.
create or replace function public.expire_expert_verifications()
returns void language sql security definer set search_path = '' as $$
  delete from public.expert_codes where expires_at < now();
  delete from public.expert_verifications where expires_at < now();
$$;
revoke execute on function public.expire_expert_verifications() from public, anon, authenticated;
select cron.schedule('expert-expiry', '45 3 * * *', 'select public.expire_expert_verifications()');
