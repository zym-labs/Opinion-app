-- Phase 7: admin & moderation (STAGE1 §9, STAGE4 §3.6), DSA statements of reasons,
-- disposable-email blocking (STAGE2 §11).

-- Admin calls require is_admin and a two-factor session (aal2).
create or replace function public.require_admin()
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'MFA_REQUIRED' using errcode = 'P0001';
  end if;
  return auth.uid();
end $$;
revoke execute on function public.require_admin from public, anon, authenticated;

-- Retry for failed AI summaries now uses the same admin check.
create or replace function public.retry_ai(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.polls set status = 'summarizing' where id = p_poll and status = 'failed_ai';
  if found then insert into public.ai_jobs (poll_id) values (p_poll); end if;
end $$;

-- Queue (AD-02): open reports grouped by target, plus auto-flagged reasons.
create or replace function public.admin_queue(p_status public.report_status default 'open', p_limit int default 100)
returns table (report_id uuid, target_type public.report_target, target_id uuid, poll_id uuid, reason public.report_reason,
               severity smallint, created_at timestamptz, report_count bigint, preview text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select distinct on (coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id))
    r.id, r.target_type, coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id),
    coalesce(r.poll_id, v.poll_id, f.poll_id), r.reason, r.severity, r.created_at,
    count(*) over (partition by coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id)),
    left(coalesce(rs.body, f.quote, p.question), 140)
  from public.reports r
  left join public.votes v on v.id = r.reason_vote_id
  left join public.reasons rs on rs.vote_id = r.reason_vote_id
  left join public.featured_insights f on f.id = r.featured_insight_id
  left join public.polls p on p.id = r.poll_id
  where r.status = p_status
  order by coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id), r.severity desc, r.created_at
  limit p_limit;
end $$;

-- Item review (AD-03).
create or replace function public.admin_item(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reports;
  v_poll uuid;
  v_author uuid;
begin
  perform public.require_admin();
  select * into r from public.reports where id = p_report;
  if r.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  v_poll := coalesce(r.poll_id, (select poll_id from public.votes where id = r.reason_vote_id),
                     (select poll_id from public.featured_insights where id = r.featured_insight_id));
  v_author := case r.target_type
    when 'poll' then (select creator_id from public.polls where id = r.poll_id)
    when 'reason' then (select voter_id from public.votes where id = r.reason_vote_id)
    else (select v.voter_id from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
          where f.id = r.featured_insight_id) end;
  return jsonb_build_object(
    'report', to_jsonb(r),
    'reports', (select jsonb_agg(jsonb_build_object('reason', x.reason, 'note', x.note, 'created_at', x.created_at))
                from public.reports x
                where coalesce(x.reason_vote_id, x.featured_insight_id, x.poll_id)
                    = coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id)),
    'poll', (select jsonb_build_object('id', p.id, 'question', p.question, 'status', p.status, 'type', p.type,
               'options', (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path))
                           from public.poll_options o where o.poll_id = p.id))
             from public.polls p where p.id = v_poll),
    'content', case r.target_type
      when 'reason' then (select body from public.reasons where vote_id = r.reason_vote_id)
      when 'featured_insight' then (select quote from public.featured_insights where id = r.featured_insight_id)
      else null end,
    'author', (select jsonb_build_object('id', a.id, 'handle', a.handle, 'status', a.status, 'created_at', a.created_at,
                 'strikes', (select count(*) from public.moderation_actions m
                             where m.target_user_id = a.id and m.action in ('remove','warn','suspend')))
               from public.profiles a where a.id = v_author));
end $$;

-- Actions (AD-03): every action is audited and the people involved are told the outcome.
create or replace function public.admin_act(p_report uuid, p_action text, p_rule text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  r public.reports;
  v_poll uuid;
  v_author uuid;
  v_question text;
  v_key uuid;
begin
  select * into r from public.reports where id = p_report;
  if r.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if p_action not in ('dismiss','remove','warn','suspend') then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if p_action <> 'dismiss' and p_rule is null then raise exception 'RULE_REQUIRED' using errcode = 'P0001'; end if;

  v_key := coalesce(r.reason_vote_id, r.featured_insight_id, r.poll_id);
  v_poll := coalesce(r.poll_id, (select poll_id from public.votes where id = r.reason_vote_id),
                     (select poll_id from public.featured_insights where id = r.featured_insight_id));
  v_question := (select question from public.polls where id = v_poll);
  v_author := case r.target_type
    when 'poll' then (select creator_id from public.polls where id = r.poll_id)
    when 'reason' then (select voter_id from public.votes where id = r.reason_vote_id)
    else (select v.voter_id from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
          where f.id = r.featured_insight_id) end;

  if p_action in ('remove','suspend') then
    case r.target_type
      when 'poll' then update public.polls set status = 'removed', removed_reason = p_rule where id = r.poll_id;
      when 'reason' then
        update public.reasons set moderation = 'rejected' where vote_id = r.reason_vote_id;
        update public.featured_insights set removed = true where reason_vote_id = r.reason_vote_id;
      else update public.featured_insights set removed = true where id = r.featured_insight_id;
    end case;
  end if;
  if p_action = 'suspend' and v_author is not null then
    update public.profiles set status = 'suspended' where id = v_author;
  end if;

  update public.reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
    resolved_at = now()
  where coalesce(reason_vote_id, featured_insight_id, poll_id) = v_key and status = 'open';

  insert into public.moderation_actions (admin_id, report_id, target_user_id, poll_id, action, rule, note)
  values (v_admin, r.id, v_author, v_poll, p_action, p_rule, p_note);

  -- Reporters learn the outcome; authors get a statement of reasons (DSA Art. 17).
  perform public.notify(x.reporter_id, 'moderation_outcome', null,
    jsonb_build_object('kind', 'reporter', 'outcome', case when p_action = 'dismiss' then 'no_action' else 'actioned' end))
  from (select distinct reporter_id from public.reports where coalesce(reason_vote_id, featured_insight_id, poll_id) = v_key
        and reporter_id is not null) x;
  if p_action <> 'dismiss' and v_author is not null then
    perform public.notify(v_author, 'moderation_outcome', null,
      jsonb_build_object('kind', 'author', 'action', p_action, 'rule', p_rule, 'target', r.target_type,
                         'question', v_question));
  end if;
end $$;

create or replace function public.admin_user(p_query text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  select p.id into v_id from public.profiles p left join auth.users u on u.id = p.id
  where p.handle = p_query or lower(u.email) = lower(p_query) limit 1;
  if v_id is null then return null; end if;
  return (select jsonb_build_object(
    'id', p.id, 'handle', p.handle, 'status', p.status, 'created_at', p.created_at,
    'onboarding_step', p.onboarding_step,
    'polls', (select count(*) from public.polls where creator_id = p.id),
    'votes', (select count(*) from public.votes where voter_id = p.id),
    'actions', (select coalesce(jsonb_agg(jsonb_build_object('action', m.action, 'rule', m.rule, 'at', m.created_at)
                order by m.created_at desc), '[]') from public.moderation_actions m where m.target_user_id = p.id))
    from public.profiles p where p.id = v_id);
end $$;

create or replace function public.admin_set_status(p_user uuid, p_status public.account_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin();
begin
  if p_status not in ('active','suspended') then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  update public.profiles set status = p_status where id = p_user and status <> 'deleted';
  insert into public.moderation_actions (admin_id, target_user_id, action, note)
  values (v_admin, p_user, case p_status when 'suspended' then 'suspend' else 'unsuspend' end, p_note);
end $$;

create or replace function public.admin_upsert_category(p_slug text, p_name text, p_sensitive boolean, p_archived boolean, p_sort smallint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  insert into public.categories (slug, name, is_sensitive, archived, sort) values (p_slug, p_name, p_sensitive, p_archived, p_sort)
  on conflict (slug) do update set name = excluded.name, is_sensitive = excluded.is_sensitive,
    archived = excluded.archived, sort = excluded.sort;
end $$;

create or replace function public.admin_upsert_community(
  p_slug text, p_name text, p_description text, p_kind public.community_kind, p_archived boolean, p_domains text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  insert into public.communities (slug, name, description, kind, archived)
  values (p_slug, p_name, p_description, p_kind, p_archived)
  on conflict (slug) do update set name = excluded.name, description = excluded.description,
    kind = excluded.kind, archived = excluded.archived
  returning id into v_id;
  delete from public.community_domains where community_id = v_id;
  insert into public.community_domains (community_id, domain)
  select v_id, lower(trim(d)) from unnest(coalesce(p_domains, '{}')) d where trim(d) <> '';
  return v_id;
end $$;

create or replace function public.admin_list_communities()
returns table (id uuid, slug text, name text, description text, kind public.community_kind, archived boolean,
               domains text[], members bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select c.id, c.slug, c.name, c.description, c.kind, c.archived,
    coalesce((select array_agg(domain) from public.community_domains d where d.community_id = c.id), '{}'),
    (select count(*) from public.user_communities m where m.community_id = c.id)
  from public.communities c order by c.name;
end $$;

-- Seed polls (STAGE7 Phase 8) are posted by the admin's own account, bypassing credits and audience size.
create or replace function public.admin_seed_poll(
  p_type public.poll_type, p_question text, p_label_a text, p_label_b text, p_categories smallint[],
  p_community uuid, p_hours smallint, p_is_taste boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid;
begin
  insert into public.polls (creator_id, type, is_taste, question, community_id, duration_hours, moderation,
                            status, published_at, closes_at)
  values (v_admin, p_type, p_is_taste, p_question, case when p_type = 'community' then p_community end,
          p_hours, 'approved', 'active', now(), now() + make_interval(hours => p_hours))
  returning id into v_id;
  insert into public.poll_options (poll_id, side, label) values (v_id, 'a', p_label_a), (v_id, 'b', p_label_b);
  if p_type = 'expert' then
    insert into public.poll_target_categories (poll_id, category_id) select v_id, unnest(p_categories);
  end if;
  return v_id;
end $$;

create or replace function public.admin_failed_ai()
returns table (poll_id uuid, question text, error text, attempts smallint, finished_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select distinct on (p.id) p.id, p.question, j.error, j.attempt, j.finished_at
  from public.polls p left join public.ai_jobs j on j.poll_id = p.id
  where p.status = 'failed_ai' order by p.id, j.finished_at desc nulls last;
end $$;

-- Metrics (AD-07): north star = share of closed polls with >= 10 reasoned votes.
create or replace function public.admin_metrics(p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => p_days);
begin
  perform public.require_admin();
  return jsonb_build_object(
    'polls_published', (select count(*) from public.polls where published_at >= since),
    'polls_closed', (select count(*) from public.polls where closes_at >= since and closes_at < now()
                     and status in ('completed','failed_ai','summarizing')),
    'north_star_pct', (select round(100.0 * count(*) filter (where n >= 10) / nullif(count(*), 0), 1) from (
        select (select count(*) from public.votes v join public.reasons r on r.vote_id = v.id
                where v.poll_id = p.id and r.moderation = 'approved') n
        from public.polls p where p.closes_at >= since and p.closes_at < now()
          and p.status in ('completed','failed_ai','summarizing')) x),
    'median_minutes_to_first_vote', (select percentile_cont(0.5) within group (order by m) from (
        select extract(epoch from (min(v.created_at) - p.published_at)) / 60 m
        from public.polls p join public.votes v on v.poll_id = p.id
        where p.published_at >= since group by p.id, p.published_at) x),
    'votes', (select count(*) from public.votes where created_at >= since),
    'new_users', (select count(*) from public.profiles where created_at >= since),
    'active_voters', (select count(distinct voter_id) from public.votes where created_at >= since),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'oldest_open_report_hours', (select round(extract(epoch from now() - min(created_at)) / 3600, 1)
                                 from public.reports where status = 'open'),
    'ai_failures', (select count(*) from public.polls where status = 'failed_ai'));
end $$;

-- Disposable email domains are refused at sign-up (STAGE2 §11).
create table public.blocked_email_domains (domain text primary key);
alter table public.blocked_email_domains enable row level security;
revoke all on public.blocked_email_domains from anon, authenticated;
insert into public.blocked_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('10minutemail.com'), ('tempmail.com'), ('temp-mail.org'),
  ('yopmail.com'), ('trashmail.com'), ('sharklasers.com'), ('getnada.com'), ('dispostable.com'),
  ('throwawaymail.com'), ('maildrop.cc'), ('fakeinbox.com'), ('mintemail.com'), ('emailondeck.com')
on conflict do nothing;

create or replace function public.block_disposable_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and exists (
    select 1 from public.blocked_email_domains where domain = lower(split_part(new.email, '@', 2))) then
    raise exception 'DISPOSABLE_EMAIL' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger block_disposable_email before insert on auth.users
  for each row execute function public.block_disposable_email();

-- New accounts get stricter moderation for their first polls (STAGE2 §11): exposed to Edge Functions.
create or replace function public.is_new_account(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select created_at > now() - interval '7 days'
                     or (select count(*) from public.polls where creator_id = p_user and status <> 'draft') < 3
                   from public.profiles where id = p_user), true);
$$;
revoke execute on function public.is_new_account from public, anon, authenticated;
