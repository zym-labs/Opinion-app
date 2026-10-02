-- Phase 3: polls, credits, safety core (STAGE3 §4, STAGE4 §3.3, §3.5).

create table public.polls (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid references public.profiles on delete set null,
  type               public.poll_type not null,
  is_taste           boolean not null default false,
  question           text not null check (char_length(question) between 5 and 120),
  community_id       uuid references public.communities,
  age_min            smallint,
  age_max            smallint,
  duration_hours     smallint not null check (duration_hours between 3 and 24),
  status             public.poll_status not null default 'draft',
  moderation         public.moderation_state not null default 'pending',
  estimated_audience int,
  published_at       timestamptz,
  closes_at          timestamptz,
  vote_count         int not null default 0,
  removed_reason     text,
  created_at         timestamptz not null default now(),
  check ((type = 'community') = (community_id is not null)),
  check (type = 'expert' or (age_min is null and age_max is null)),
  check ((age_min is null) = (age_max is null)),
  check (age_min is null or (age_min >= 18 and age_max - age_min >= 5))
);

create table public.poll_options (
  poll_id          uuid references public.polls on delete cascade,
  side             public.vote_side,
  label            text check (char_length(label) <= 60),
  image_path       text,
  image_moderation public.moderation_state,
  primary key (poll_id, side),
  check (label is not null or image_path is not null)
);

create table public.poll_target_categories (
  poll_id     uuid references public.polls on delete cascade,
  category_id smallint references public.categories,
  primary key (poll_id, category_id)
);

create table public.credit_ledger (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles on delete cascade,
  delta        smallint not null,
  reason       public.credit_reason not null,
  poll_id      uuid,
  vote_id      uuid,
  available_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table public.hidden_creators (
  user_id        uuid references public.profiles on delete cascade,
  creator_id     uuid references public.profiles on delete cascade,
  source_poll_id uuid references public.polls on delete set null,
  created_at     timestamptz not null default now(),
  primary key (user_id, creator_id)
);

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid references public.profiles on delete set null,
  target_type         public.report_target not null,
  poll_id             uuid references public.polls on delete cascade,
  reason_vote_id      uuid,
  featured_insight_id uuid,
  reason              public.report_reason not null,
  note                text check (char_length(note) <= 300),
  status              public.report_status not null default 'open',
  severity            smallint not null default 1,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);
create unique index reports_once on public.reports
  (reporter_id, target_type, coalesce(reason_vote_id, featured_insight_id, poll_id));

create table public.moderation_actions (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references public.profiles on delete set null,
  report_id      uuid references public.reports on delete set null,
  target_user_id uuid references public.profiles on delete set null,
  poll_id        uuid references public.polls on delete set null,
  action         text not null check (action in ('dismiss','remove','warn','suspend','unsuspend','restore')),
  rule           text,
  note           text,
  created_at     timestamptz not null default now()
);

create table public.rate_limits (
  user_id      uuid references public.profiles on delete cascade,
  action       text,
  window_start timestamptz,
  hits         int not null default 0,
  primary key (user_id, action, window_start)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_target_categories enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.hidden_creators enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.polls, public.poll_options, public.poll_target_categories, public.credit_ledger,
  public.hidden_creators, public.reports, public.moderation_actions, public.rate_limits from anon, authenticated;

create index on public.polls (status, closes_at);
create index on public.polls (creator_id, created_at desc);
create index on public.poll_target_categories (category_id, poll_id);
create index on public.polls (community_id) where status = 'active';
create index on public.credit_ledger (user_id);
create index on public.reports (status, severity desc, created_at);

-- Helpers ------------------------------------------------------------------

create or replace function public.credit_units(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger
  where user_id = p_user and available_at <= now();
$$;

-- Fixed-window rate limit. Raises RATE_LIMITED when exceeded.
create or replace function public.hit_rate_limit(p_user uuid, p_action text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window))
                                * extract(epoch from p_window));
  n int;
begin
  insert into public.rate_limits as r (user_id, action, window_start, hits) values (p_user, p_action, w, 1)
  on conflict (user_id, action, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if n > p_max then raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
end $$;

-- Users eligible to see a poll with this targeting (STAGE3 §8), excluding the creator.
create or replace function public.audience_ids(
  p_creator uuid, p_type public.poll_type, p_categories smallint[], p_age_min smallint,
  p_age_max smallint, p_community uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p
  where p.status = 'active' and p.onboarding_step = 'complete' and p.id is distinct from p_creator
    and not exists (select 1 from public.hidden_creators h where h.user_id = p.id and h.creator_id = p_creator)
    and case p_type
      when 'expert' then
        exists (select 1 from public.user_categories uc where uc.user_id = p.id and uc.category_id = any(p_categories))
        and (p_age_min is null or
             extract(year from now())::int - p.birth_year between p_age_min and p_age_max)
      else exists (select 1 from public.user_communities m where m.user_id = p.id and m.community_id = p_community)
    end
$$;

create or replace function public.estimate_audience(
  p_type public.poll_type, p_categories smallint[] default '{}', p_age_min smallint default null,
  p_age_max smallint default null, p_community uuid default null)
returns int language plpgsql stable security definer set search_path = '' as $$
declare n int;
begin
  perform public.require_user();
  select count(*) into n from public.audience_ids(auth.uid(), p_type, p_categories, p_age_min, p_age_max, p_community);
  return case when n < 20 then n else (n / 10) * 10 end;
end $$;

-- Signup bonus when onboarding completes (SPEC: first poll free).
create or replace function public.grant_signup_bonus() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.onboarding_step = 'complete' and old.onboarding_step <> 'complete'
     and not exists (select 1 from public.credit_ledger where user_id = new.id and reason = 'signup_bonus') then
    insert into public.credit_ledger (user_id, delta, reason) values (new.id, 3, 'signup_bonus');
  end if;
  return new;
end $$;
create trigger on_onboarding_complete after update of onboarding_step on public.profiles
  for each row execute function public.grant_signup_bonus();

-- Poll creation (called by the polls Edge Function after text moderation) --------

create or replace function public.create_poll_draft(
  p_user uuid, p_type public.poll_type, p_is_taste boolean, p_question text,
  p_label_a text, p_label_b text, p_categories smallint[], p_age_min smallint, p_age_max smallint,
  p_community uuid, p_duration smallint, p_moderation public.moderation_state)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  n int := coalesce(array_length(p_categories, 1), 0);
begin
  perform public.hit_rate_limit(p_user, 'draft', 10, interval '1 day');
  if p_type = 'expert' and (n < 1 or n > 5) then raise exception 'CATEGORY_LIMIT' using errcode = 'P0001'; end if;
  if p_type = 'community' and not exists (
    select 1 from public.user_communities where user_id = p_user and community_id = p_community) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  insert into public.polls (creator_id, type, is_taste, question, community_id, age_min, age_max,
                            duration_hours, moderation)
  values (p_user, p_type, p_is_taste, p_question, case when p_type = 'community' then p_community end,
          case when p_type = 'expert' then p_age_min end, case when p_type = 'expert' then p_age_max end,
          p_duration, p_moderation)
  returning id into v_id;
  insert into public.poll_options (poll_id, side, label) values (v_id, 'a', p_label_a), (v_id, 'b', p_label_b);
  if p_type = 'expert' then
    insert into public.poll_target_categories (poll_id, category_id) select v_id, unnest(p_categories);
  end if;
  return v_id;
end $$;

create or replace function public.publish_poll_internal(p_user uuid, p_poll uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  pl public.polls;
  aud int;
  cats smallint[];
begin
  select * into pl from public.polls where id = p_poll and creator_id = p_user for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status <> 'draft' then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if pl.moderation <> 'approved' then raise exception 'CONTENT_REJECTED' using errcode = 'P0001'; end if;
  if exists (select 1 from public.poll_options where poll_id = p_poll
             and image_path is not null and image_moderation is distinct from 'approved') then
    raise exception 'IMAGE_PENDING' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(category_id), '{}') into cats from public.poll_target_categories where poll_id = p_poll;
  select count(*) into aud from public.audience_ids(p_user, pl.type, cats, pl.age_min, pl.age_max, pl.community_id);
  if aud < 20 then raise exception 'AUDIENCE_TOO_SMALL' using errcode = 'P0001'; end if;
  if public.credit_units(p_user) < 3 then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;
  insert into public.credit_ledger (user_id, delta, reason, poll_id) values (p_user, -3, 'poll_publish', p_poll);
  update public.polls set status = 'active', published_at = now(),
    closes_at = now() + make_interval(hours => duration_hours), estimated_audience = aud
  where id = p_poll;
  return now() + make_interval(hours => pl.duration_hours);
end $$;

create or replace function public.delete_poll(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare pl public.polls;
begin
  perform public.require_user();
  select * into pl from public.polls where id = p_poll and creator_id = auth.uid() for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.vote_count > 0 then raise exception 'POLL_HAS_VOTES' using errcode = 'P0001'; end if;
  if pl.status not in ('draft','active') then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if pl.status = 'active' then
    insert into public.credit_ledger (user_id, delta, reason, poll_id) values (auth.uid(), 3, 'poll_refund', p_poll);
  end if;
  update public.polls set status = 'deleted' where id = p_poll;
end $$;

-- Safety -------------------------------------------------------------------

create or replace function public.submit_report(
  p_target public.report_target, p_target_id uuid, p_reason public.report_reason, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_poll uuid;
begin
  perform public.require_user();
  perform public.hit_rate_limit(auth.uid(), 'report', 20, interval '1 day');
  v_poll := case p_target when 'poll' then p_target_id end;
  insert into public.reports (reporter_id, target_type, poll_id, reason_vote_id, featured_insight_id, reason, note, severity)
  values (auth.uid(), p_target, v_poll,
          case p_target when 'reason' then p_target_id end,
          case p_target when 'featured_insight' then p_target_id end,
          p_reason, nullif(trim(p_note), ''),
          case when p_reason in ('self_harm','hate','sexual') then 3 when p_reason in ('harassment','personal_info') then 2 else 1 end)
  on conflict do nothing;
end $$;

create or replace function public.hide_creator(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_creator uuid;
begin
  perform public.require_user();
  select creator_id into v_creator from public.polls where id = p_poll;
  if v_creator is null or v_creator = auth.uid() then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  insert into public.hidden_creators (user_id, creator_id, source_poll_id) values (auth.uid(), v_creator, p_poll)
  on conflict do nothing;
end $$;

-- Lists hidden creators by the poll that caused the hide; never returns creator ids.
create or replace function public.list_hidden_creators()
returns table (source_poll_id uuid, question text, hidden_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.source_poll_id, coalesce(p.question, 'Deleted poll'), h.created_at
  from public.hidden_creators h left join public.polls p on p.id = h.source_poll_id
  where h.user_id = auth.uid() order by h.created_at desc;
$$;

create or replace function public.unhide_creator(p_source_poll uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.hidden_creators where user_id = auth.uid() and source_poll_id = p_source_poll;
$$;

-- Images: private bucket, path "<poll_id>/<side>.jpg" (STAGE3 §9) ---------------

insert into storage.buckets (id, name, public) values ('poll-images', 'poll-images', false)
on conflict (id) do nothing;

create policy "creator uploads draft images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'poll-images' and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.creator_id = auth.uid() and p.status = 'draft')
);

create policy "read images of visible polls" on storage.objects for select to authenticated
using (
  bucket_id = 'poll-images' and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1)
      and (p.creator_id = auth.uid() or (p.status in ('active','closing','summarizing','completed','failed_ai')
                                          and p.moderation = 'approved')))
);

revoke execute on function public.create_poll_draft, public.publish_poll_internal, public.audience_ids,
  public.hit_rate_limit, public.credit_units from public, anon, authenticated;
