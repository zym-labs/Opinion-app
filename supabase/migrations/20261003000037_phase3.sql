-- Phase 3: Opinion+ subscription, Campus Pulse sponsored polls, per-user language for AI summaries.

-- 1. Language -----------------------------------------------------------------------------------
-- The app reports the device language; AI summaries are written in the asker's language.
alter table public.profiles add column locale text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

create or replace function public.set_locale(p_locale text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user(false);
  if p_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  update public.profiles set locale = p_locale where id = auth.uid() and locale is distinct from p_locale;
end $$;
revoke execute on function public.set_locale(text) from public, anon;
grant execute on function public.set_locale(text) to authenticated;

drop function public.claim_ai_jobs(int);
create or replace function public.claim_ai_jobs(p_limit int default 5)
returns table (job_id uuid, poll_id uuid, attempt smallint, question text, is_sensitive boolean,
               options jsonb, reasons jsonb, language text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimed as (
    update public.ai_jobs j set status = 'running', attempt = j.attempt + 1, started_at = now()
    where j.id in (select id from public.ai_jobs where status = 'queued' and run_after <= now()
                   order by run_after limit p_limit for update skip locked)
    returning j.id, j.poll_id, j.attempt
  )
  select c.id, c.poll_id, c.attempt, p.question,
    exists (select 1 from public.poll_target_categories t join public.categories cat on cat.id = t.category_id
            where t.poll_id = p.id and cat.is_sensitive),
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label,
              'votes', coalesce((r.counts->>o.side::text)::int, 0)) order by o.side)
     from public.poll_options o where o.poll_id = p.id),
    coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'side', v.side, 'text', coalesce(rs.pii_redacted, rs.body),
        'consent', v.feature_consent) order by v.id)
      from public.votes v join public.reasons rs on rs.vote_id = v.id
      where v.poll_id = p.id and rs.moderation = 'approved' and not rs.injection_flag), '[]'),
    coalesce((select pr.locale from public.profiles pr where pr.id = p.creator_id), 'en')
  from claimed c join public.polls p on p.id = c.poll_id join public.poll_results r on r.poll_id = p.id;
end $$;
revoke execute on function public.claim_ai_jobs from public, anon, authenticated;

-- 2. Opinion+ ------------------------------------------------------------------------------------
-- Entitlement comes only from the store, via the RevenueCat webhook (service role). The app can read
-- its own status but never write it. Perks never buy votes or visibility over other people's answers:
-- two free boosts a month, polls up to 48 hours, and journal export.
create table public.subscriptions (
  user_id    uuid primary key references public.profiles on delete cascade,
  product_id text not null,
  active     boolean not null,
  expires_at timestamptz,
  store      text,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;

create or replace function public.has_plus(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select active and (expires_at is null or expires_at > now())
                   from public.subscriptions where user_id = p_user), false);
$$;
revoke execute on function public.has_plus(uuid) from public, anon, authenticated;

-- Called by the revenuecat Edge Function with the service role.
create or replace function public.set_subscription(p_user uuid, p_product text, p_active boolean,
                                                   p_expires timestamptz, p_store text)
returns void language sql security definer set search_path = '' as $$
  insert into public.subscriptions (user_id, product_id, active, expires_at, store, updated_at)
  select p_user, p_product, p_active, p_expires, p_store, now()
  where exists (select 1 from public.profiles where id = p_user)
  on conflict (user_id) do update set product_id = excluded.product_id, active = excluded.active,
    expires_at = excluded.expires_at, store = excluded.store, updated_at = now();
$$;
revoke execute on function public.set_subscription(uuid, text, boolean, timestamptz, text) from public, anon, authenticated;

create table public.plus_boosts (
  user_id uuid not null references public.profiles on delete cascade,
  poll_id uuid not null references public.polls on delete cascade,
  used_at timestamptz not null default now(),
  primary key (user_id, poll_id)
);
alter table public.plus_boosts enable row level security;
revoke all on public.plus_boosts from anon, authenticated;

create or replace function public.my_plus()
returns table (active boolean, expires_at timestamptz, boosts_left int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query select public.has_plus(auth.uid()),
    (select s.expires_at from public.subscriptions s where s.user_id = auth.uid()),
    case when public.has_plus(auth.uid()) then greatest(0, 2 - (select count(*)::int from public.plus_boosts b
      where b.user_id = auth.uid() and b.used_at >= date_trunc('month', now()))) else 0 end;
end $$;
revoke execute on function public.my_plus() from public, anon;
grant execute on function public.my_plus() to authenticated;

-- Boost: Opinion+ members use a monthly free boost first, then credits as before.
create or replace function public.boost_poll(p_poll uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles; pl public.polls; n int; v_free boolean;
begin
  me := public.require_user();
  select * into pl from public.polls where id = p_poll and creator_id = me.id for update;
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status <> 'active' or pl.closes_at < now() + interval '30 minutes' then
    raise exception 'POLL_CLOSED' using errcode = 'P0001';
  end if;
  if pl.friends_only then raise exception 'NOT_ELIGIBLE' using errcode = 'P0001'; end if;
  if pl.boosted_at is not null then raise exception 'ALREADY_BOOSTED' using errcode = 'P0001'; end if;
  v_free := public.has_plus(me.id) and (select count(*) from public.plus_boosts b
            where b.user_id = me.id and b.used_at >= date_trunc('month', now())) < 2;
  if v_free then
    insert into public.plus_boosts (user_id, poll_id) values (me.id, p_poll);
  else
    if public.credit_units(me.id) < 3 then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;
    insert into public.credit_ledger (user_id, delta, reason, poll_id) values (me.id, -3, 'boost', p_poll);
  end if;
  update public.polls set boosted_at = now() where id = p_poll;

  with picked as (
    select x as user_id from public.audience_ids(pl.creator_id, pl.type,
      coalesce((select array_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '{}'),
      pl.age_min, pl.age_max, pl.community_id) x
    where not exists (select 1 from public.votes v where v.poll_id = pl.id and v.voter_id = x)
      and not exists (select 1 from public.notifications n where n.user_id = x
                      and n.type in ('last_call', 'boosted_poll') and n.created_at > now() - interval '1 day')
    order by random() limit 50
  )
  select count(*) into n from (
    select public.notify(user_id, 'boosted_poll', pl.id, jsonb_build_object('question', pl.question)) from picked
  ) s;
  return n;
end $$;
revoke execute on function public.boost_poll(uuid) from public, anon;
grant execute on function public.boost_poll(uuid) to authenticated;

-- Longer polls for Opinion+ (up to 48 hours).
alter table public.polls drop constraint polls_duration_hours_check;
alter table public.polls add constraint polls_duration_hours_check check (duration_hours between 3 and 48);

create or replace function public.check_poll_duration() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.duration_hours > 24 and new.daily_on is null and not public.has_plus(new.creator_id) then
    raise exception 'PLUS_REQUIRED' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.check_poll_duration() from public, anon, authenticated;
create trigger polls_duration_plus before insert on public.polls
  for each row execute function public.check_poll_duration();

-- 3. Campus Pulse (sponsored questions) ------------------------------------------------------------
-- Organisations (clubs, student unions, brands) can ask a community or topic a question. It is always
-- labelled with the sponsor, only shown to people who opted in, and voters get 2 extra credit units.
-- Sponsors see aggregate results only, exactly like any asker.
alter table public.polls add column sponsor_name text check (sponsor_name is null or char_length(sponsor_name) between 2 and 60);
alter table public.profiles add column sponsored_opt_in boolean not null default false;

create or replace function public.set_sponsored_opt_in(p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  update public.profiles set sponsored_opt_in = p_on where id = auth.uid();
end $$;
revoke execute on function public.set_sponsored_opt_in(boolean) from public, anon;
grant execute on function public.set_sponsored_opt_in(boolean) to authenticated;

create or replace function public.my_sponsored_opt_in()
returns boolean language sql stable security definer set search_path = '' as $$
  select sponsored_opt_in from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_sponsored_opt_in() from public, anon;
grant execute on function public.my_sponsored_opt_in() to authenticated;

create or replace function public.admin_create_sponsored_poll(
  p_sponsor text, p_question text, p_labels text[], p_hours smallint,
  p_community uuid default null, p_category smallint default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin(); v_id uuid; n int := coalesce(array_length(p_labels, 1), 0);
begin
  if n < 2 or n > 4 or char_length(p_question) not between 5 and 120 or p_hours not between 3 and 48
     or (p_community is null) = (p_category is null) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  insert into public.polls (creator_id, type, is_taste, question, community_id, duration_hours, moderation,
                            status, published_at, closes_at, sponsor_name)
  values (v_admin, case when p_community is null then 'expert' else 'community' end::public.poll_type, true,
          p_question, p_community, p_hours, 'approved', 'active', now(), now() + make_interval(hours => p_hours),
          trim(p_sponsor))
  returning id into v_id;
  insert into public.poll_options (poll_id, side, label)
  select v_id, (array['a','b','c','d'])[i]::public.vote_side, p_labels[i] from generate_series(1, n) i;
  if p_category is not null then
    insert into public.poll_target_categories (poll_id, category_id) values (v_id, p_category);
  end if;
  return v_id;
end $$;

create or replace function public.admin_sponsored_polls()
returns table (poll_id uuid, sponsor text, question text, status public.poll_status, vote_count int,
               closes_at timestamptz, result jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select p.id, p.sponsor_name, p.question, p.status, p.vote_count, p.closes_at,
    case when exists (select 1 from public.poll_results r where r.poll_id = p.id)
         then public.result_payload(p.id, null, true) - 'featured' end
  from public.polls p where p.sponsor_name is not null order by p.created_at desc limit 100;
end $$;
revoke execute on function public.admin_create_sponsored_poll(text, text, text[], smallint, uuid, smallint),
  public.admin_sponsored_polls() from public, anon;
grant execute on function public.admin_create_sponsored_poll(text, text, text[], smallint, uuid, smallint),
  public.admin_sponsored_polls() to authenticated;

-- Voters on sponsored questions get 2 extra credit units.
create or replace function public.credit_sponsored_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.voter_id is not null and exists (select 1 from public.polls where id = new.poll_id and sponsor_name is not null) then
    insert into public.credit_ledger (user_id, delta, reason, poll_id, vote_id) values (new.voter_id, 2, 'sponsored', new.poll_id, new.id);
  end if;
  return new;
end $$;
revoke execute on function public.credit_sponsored_vote() from public, anon, authenticated;
create trigger on_vote_credit_sponsored after insert on public.votes
  for each row execute function public.credit_sponsored_vote();

-- Feed: sponsored questions only for people who opted in, clearly labelled.
create or replace function public.get_feed_for(
  p_user uuid, p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  select * into me from public.profiles pr where pr.id = p_user;
  return query
  select p.id, p.type, p.is_taste, p.question, p.closes_at,
    case when p.sponsor_name is not null then 'Sponsored · ' || p.sponsor_name
      when p.daily_on is not null then 'Today’s question'
      when p.friends_only then 'Friends'
      when p.type = 'community' then (select c.name from public.communities c where c.id = p.community_id)
      else (select string_agg(c.name, ' · ' order by c.sort) from public.poll_target_categories t
            join public.categories c on c.id = t.category_id where t.poll_id = p.id) end,
    exists (select 1 from public.poll_target_categories t join public.categories c on c.id = t.category_id
            where t.poll_id = p.id and c.is_sensitive),
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path) order by o.side)
     from public.poll_options o where o.poll_id = p.id),
    (p.vote_count >= 10)::int,
    (select pp.question from public.polls pp where pp.id = p.parent_poll_id)
  from public.polls p
  where p.status = 'active' and p.moderation = 'approved' and p.closes_at > now()
    and p.creator_id is distinct from me.id
    and (p_only is not null or p.daily_on is null)
    and (p.sponsor_name is null or me.sponsored_opt_in)
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.info_requests i where i.poll_id = p.id and i.user_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
    and (
      p.daily_on is not null
      or exists (select 1 from public.poll_invitees i where i.poll_id = p.id and i.user_id = me.id)
      or (not p.friends_only and case p.type
        when 'expert' then
          exists (select 1 from public.poll_target_categories t join public.user_categories uc
                  on uc.category_id = t.category_id where t.poll_id = p.id and uc.user_id = me.id)
          and (p.age_min is null or extract(year from now())::int - me.birth_year between p.age_min and p.age_max)
        else exists (select 1 from public.user_communities m where m.user_id = me.id and m.community_id = p.community_id)
      end))
    and (p_after_closes is null
         or ((p.vote_count >= 10)::int, p.closes_at, p.id) > (coalesce(p_after_bucket, 0), p_after_closes, p_after_id))
    and (p_only is null or p.id = p_only)
  order by (p.vote_count >= 10)::int, p.closes_at, p.id
  limit least(p_limit, 50);
end $$;
revoke execute on function public.get_feed_for(uuid, int, timestamptz, uuid, uuid, int) from public, anon, authenticated;
