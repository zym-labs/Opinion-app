-- Phase 4: votes, reasons, feed (STAGE3 §4, §8; STAGE4 §3.2).

create table public.votes (
  id              uuid primary key default gen_random_uuid(),
  poll_id         uuid not null references public.polls on delete cascade,
  voter_id        uuid references public.profiles on delete set null,
  side            public.vote_side not null,
  predicted_side  public.vote_side,
  feature_consent boolean not null,
  created_at      timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create table public.reasons (
  vote_id          uuid primary key references public.votes on delete cascade,
  body             text not null check (char_length(body) <= 200),
  moderation       public.moderation_state not null default 'pending',
  moderation_flags jsonb,
  pii_redacted     text,
  injection_flag   boolean not null default false
);

alter table public.votes enable row level security;
alter table public.reasons enable row level security;
revoke all on public.votes, public.reasons from anon, authenticated;

create index on public.votes (voter_id, created_at desc);
create index on public.reasons (moderation) where moderation = 'pending' or pii_redacted is null;

-- Called by the votes Edge Function after synchronous moderation of the reason.
create or replace function public.cast_vote_internal(
  p_user uuid, p_poll uuid, p_side public.vote_side, p_reason text, p_predicted public.vote_side,
  p_consent boolean, p_reason_moderation public.moderation_state, p_flags jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  pl public.polls;
  prof public.profiles;
  cats smallint[];
  v_vote uuid;
  reason_text text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into prof from public.profiles where id = p_user;
  if prof.status <> 'active' then raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001'; end if;
  if prof.onboarding_step <> 'complete' then raise exception 'ONBOARDING_INCOMPLETE' using errcode = 'P0001'; end if;
  perform public.hit_rate_limit(p_user, 'vote', 60, interval '1 hour');

  select * into pl from public.polls where id = p_poll for update;
  if pl.id is null or pl.status in ('removed','deleted','draft') then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if pl.status <> 'active' or pl.closes_at <= now() then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if pl.creator_id = p_user then raise exception 'CANNOT_VOTE_OWN_POLL' using errcode = 'P0001'; end if;
  select coalesce(array_agg(category_id), '{}') into cats from public.poll_target_categories where poll_id = p_poll;
  if not exists (select 1 from public.audience_ids(pl.creator_id, pl.type, cats, pl.age_min, pl.age_max, pl.community_id) a
                 where a = p_user) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if not p_consent then raise exception 'CONSENT_REQUIRED' using errcode = 'P0001'; end if;
  if pl.type = 'expert' and not pl.is_taste and coalesce(char_length(reason_text), 0) < 20 then
    raise exception 'REASON_TOO_SHORT' using errcode = 'P0001';
  end if;
  if char_length(reason_text) > 200 then raise exception 'REASON_TOO_LONG' using errcode = 'P0001'; end if;
  if reason_text is not null and p_reason_moderation = 'rejected' then
    raise exception 'REASON_REJECTED' using errcode = 'P0001';
  end if;

  insert into public.votes (poll_id, voter_id, side, predicted_side, feature_consent)
  values (p_poll, p_user, p_side, p_predicted, p_consent)
  on conflict (poll_id, voter_id) do nothing
  returning id into v_vote;
  if v_vote is null then raise exception 'ALREADY_VOTED' using errcode = 'P0001'; end if;

  if reason_text is not null then
    insert into public.reasons (vote_id, body, moderation, moderation_flags)
    values (v_vote, reason_text, p_reason_moderation, p_flags);
  end if;

  update public.polls set vote_count = vote_count + 1 where id = p_poll;
  -- Vote credits count only once the account is 24h old (STAGE2 §11).
  insert into public.credit_ledger (user_id, delta, reason, poll_id, vote_id, available_at)
  values (p_user, 1, 'vote', p_poll, v_vote, greatest(now(), prof.created_at + interval '24 hours'));
  return pl.closes_at;
end $$;

-- Feed: open polls the caller can vote on (STAGE3 §8). No creator ids, no counts.
create or replace function public.get_feed(p_limit int default 20, p_after_closes timestamptz default null,
                                           p_after_id uuid default null, p_only uuid default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user();
  return query
  select p.id, p.type, p.is_taste, p.question, p.closes_at,
    case p.type when 'community' then (select c.name from public.communities c where c.id = p.community_id)
      else (select string_agg(c.name, ' · ' order by c.sort) from public.poll_target_categories t
            join public.categories c on c.id = t.category_id where t.poll_id = p.id) end,
    exists (select 1 from public.poll_target_categories t join public.categories c on c.id = t.category_id
            where t.poll_id = p.id and c.is_sensitive),
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path) order by o.side)
     from public.poll_options o where o.poll_id = p.id)
  from public.polls p
  where p.status = 'active' and p.moderation = 'approved' and p.closes_at > now()
    and p.creator_id is distinct from me.id
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
    and case p.type
      when 'expert' then
        exists (select 1 from public.poll_target_categories t join public.user_categories uc
                on uc.category_id = t.category_id where t.poll_id = p.id and uc.user_id = me.id)
        and (p.age_min is null or extract(year from now())::int - me.birth_year between p.age_min and p.age_max)
      else exists (select 1 from public.user_communities m where m.user_id = me.id and m.community_id = p.community_id)
    end
    and (p_after_closes is null or (p.closes_at, p.id) > (p_after_closes, p_after_id))
    and (p_only is null or p.id = p_only)
  order by p.closes_at, p.id
  limit least(p_limit, 50);
end $$;

-- Polls I voted on that are still open.
create or replace function public.get_waiting()
returns table (id uuid, question text, closes_at timestamptz, my_side public.vote_side, options jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.closes_at, v.side,
    (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label) order by o.side)
     from public.poll_options o where o.poll_id = p.id)
  from public.votes v join public.polls p on p.id = v.poll_id
  where v.voter_id = auth.uid() and p.status in ('active','closing','summarizing')
  order by p.closes_at;
end $$;

-- Creator's polls (M-01) with live vote count only.
create or replace function public.get_my_polls(p_completed boolean)
returns table (id uuid, question text, type public.poll_type, status public.poll_status,
               vote_count int, closes_at timestamptz, created_at timestamptz, removed_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.type, p.status, p.vote_count, p.closes_at, p.created_at, p.removed_reason
  from public.polls p
  where p.creator_id = auth.uid() and p.status <> 'deleted'
    and (case when p_completed then p.status in ('completed','failed_ai','removed')
              else p.status in ('draft','active','closing','summarizing') end)
  order by p.created_at desc limit 100;
end $$;

create or replace function public.get_poll_for_vote(p_poll uuid)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb)
language sql stable security definer set search_path = '' as $$
  select * from public.get_feed(1, null, null, p_poll);
$$;

-- Credits for the header pill: units, polls available, progress to next poll.
create or replace function public.get_credits()
returns table (units int, polls_available int, pending_units int)
language plpgsql stable security definer set search_path = '' as $$
declare u int;
begin
  perform public.require_user();
  u := public.credit_units(auth.uid());
  return query select u, u / 3,
    (select coalesce(sum(delta), 0)::int from public.credit_ledger
     where user_id = auth.uid() and available_at > now());
end $$;

revoke execute on function public.cast_vote_internal from public, anon, authenticated;

-- Realtime vote count for creators: clients subscribe to their own polls rows.
create policy "creator reads own polls" on public.polls for select to authenticated using (creator_id = auth.uid());
grant select (id, vote_count, status, closes_at) on public.polls to authenticated;
alter publication supabase_realtime add table public.polls;
