-- Phase 5–6: closing, AI jobs, results, notifications, stats (STAGE3 §4, STAGE4 §4–5).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.poll_results (
  poll_id          uuid primary key references public.polls on delete cascade,
  total_votes      int not null,
  votes_a          int,
  votes_b          int,
  pct_a            numeric(5,2),
  pct_b            numeric(5,2),
  winner           public.vote_side,
  predicted_a_pct  numeric(5,2),
  summary_majority text,
  summary_minority text,
  summary_model    text,
  summary_version  smallint,
  generated_at     timestamptz
);

create table public.featured_insights (
  id             uuid primary key default gen_random_uuid(),
  poll_id        uuid not null references public.poll_results on delete cascade,
  reason_vote_id uuid references public.reasons on delete set null,
  quote          text not null,
  side           public.vote_side not null,
  rank           smallint not null check (rank between 1 and 3),
  removed        boolean not null default false,
  unique (poll_id, rank)
);

create table public.result_views (
  poll_id             uuid references public.polls on delete cascade,
  user_id             uuid references public.profiles on delete cascade,
  first_opened_at     timestamptz,
  viewed_at           timestamptz,
  in_majority         boolean,
  predicted_correctly boolean,
  primary key (poll_id, user_id)
);

create table public.ai_jobs (
  id                 uuid primary key default gen_random_uuid(),
  poll_id            uuid not null references public.polls on delete cascade,
  attempt            smallint not null default 0,
  status             text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  run_after          timestamptz not null default now(),
  model              text,
  input_reason_count int,
  error              text,
  tokens_in          int,
  tokens_out         int,
  started_at         timestamptz,
  finished_at        timestamptz
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  type       public.notif_type not null,
  poll_id    uuid references public.polls on delete cascade,
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.poll_results enable row level security;
alter table public.featured_insights enable row level security;
alter table public.result_views enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.notifications enable row level security;
revoke all on public.poll_results, public.featured_insights, public.result_views, public.ai_jobs,
  public.notifications from anon, authenticated;

create index on public.result_views (user_id) where viewed_at is null;
create index on public.ai_jobs (status, run_after);
create index on public.notifications (user_id, created_at desc);
create index on public.notifications (sent_at) where sent_at is null;

-- Queue a notification if the user's preferences allow it.
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'summary_ready' then n.summary_ready
      when 'insight_featured' then n.insight_featured when 'new_polls_digest' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true);
$$;

-- Closing (runs every minute) ----------------------------------------------

create or replace function public.close_due_polls()
returns int language plpgsql security definer set search_path = '' as $$
declare
  pl record;
  a int; b int; t int; pa int; pn int;
  w public.vote_side;
  closed int := 0;
begin
  for pl in
    select * from public.polls where status = 'active' and closes_at <= now() for update skip locked
  loop
    update public.polls set status = 'closing' where id = pl.id;
    select count(*) filter (where side = 'a'), count(*) filter (where side = 'b'),
           count(*) filter (where predicted_side = 'a'), count(*) filter (where predicted_side is not null)
      into a, b, pa, pn
      from public.votes where poll_id = pl.id;
    t := a + b;
    w := case when t < 10 or a = b then null when a > b then 'a' else 'b' end;

    insert into public.poll_results (poll_id, total_votes, votes_a, votes_b, pct_a, pct_b, winner, predicted_a_pct)
    values (pl.id, t,
      case when t >= 10 then a end, case when t >= 10 then b end,
      case when t >= 10 then round(100.0 * a / t, 2) end, case when t >= 10 then round(100.0 * b / t, 2) end,
      w, case when t >= 10 and pn > 0 then round(100.0 * pa / pn, 2) end)
    on conflict (poll_id) do nothing;

    insert into public.result_views (poll_id, user_id, in_majority, predicted_correctly)
    select pl.id, v.voter_id,
      case when w is null then null else v.side = w end,
      case when w is null or v.predicted_side is null then null else v.predicted_side = w end
    from public.votes v where v.poll_id = pl.id and v.voter_id is not null
    on conflict do nothing;

    if t >= 10 then
      update public.polls set status = 'summarizing' where id = pl.id;
      insert into public.ai_jobs (poll_id) values (pl.id);
    else
      update public.polls set status = 'completed' where id = pl.id;
      perform public.notify(r.user_id, 'poll_ended', pl.id, jsonb_build_object('question', pl.question))
        from public.result_views r where r.poll_id = pl.id;
      if pl.creator_id is not null then
        perform public.notify(pl.creator_id, 'summary_ready', pl.id, jsonb_build_object('question', pl.question));
      end if;
    end if;
    closed := closed + 1;
  end loop;

  -- View-once backup: results opened more than 10s ago count as viewed.
  update public.result_views set viewed_at = now()
  where viewed_at is null and first_opened_at < now() - interval '10 seconds';
  return closed;
end $$;

-- AI worker API (service role only) ----------------------------------------

-- Claims up to n queued jobs; returns poll id plus the material the summarizer needs.
create or replace function public.claim_ai_jobs(p_limit int default 5)
returns table (job_id uuid, poll_id uuid, attempt smallint, question text, is_sensitive boolean,
               label_a text, label_b text, votes_a int, votes_b int, reasons jsonb)
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
    (select label from public.poll_options where poll_id = p.id and side = 'a'),
    (select label from public.poll_options where poll_id = p.id and side = 'b'),
    r.votes_a, r.votes_b,
    coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'side', v.side, 'text', coalesce(rs.pii_redacted, rs.body),
        'consent', v.feature_consent) order by v.id)
      from public.votes v join public.reasons rs on rs.vote_id = v.id
      where v.poll_id = p.id and rs.moderation = 'approved' and not rs.injection_flag), '[]')
  from claimed c join public.polls p on p.id = c.poll_id join public.poll_results r on r.poll_id = p.id;
end $$;

create or replace function public.complete_ai_job(
  p_job uuid, p_majority text, p_minority text, p_featured jsonb, p_model text,
  p_tokens_in int, p_tokens_out int, p_reason_count int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_poll uuid;
  pl public.polls;
  f jsonb;
  i int := 0;
begin
  update public.ai_jobs set status = 'succeeded', finished_at = now(), model = p_model,
    tokens_in = p_tokens_in, tokens_out = p_tokens_out, input_reason_count = p_reason_count
  where id = p_job returning poll_id into v_poll;
  select * into pl from public.polls where id = v_poll;
  update public.poll_results set summary_majority = p_majority, summary_minority = p_minority,
    summary_model = p_model, summary_version = 1, generated_at = now()
  where poll_id = v_poll;
  -- Featured quotes must be exact copies of stored, consented reasons (STAGE4 §5 step 3).
  for f in select * from jsonb_array_elements(coalesce(p_featured, '[]')) loop
    exit when i >= 3;
    insert into public.featured_insights (poll_id, reason_vote_id, quote, side, rank)
    select v_poll, v.id, coalesce(rs.pii_redacted, rs.body), v.side, i + 1
    from public.votes v join public.reasons rs on rs.vote_id = v.id
    where v.id = (f->>'id')::uuid and v.poll_id = v_poll and v.feature_consent and rs.moderation = 'approved';
    if found then
      i := i + 1;
      perform public.notify(v.voter_id, 'insight_featured', v_poll, jsonb_build_object('question', pl.question))
        from public.votes v where v.id = (f->>'id')::uuid and v.voter_id is not null;
    end if;
  end loop;
  perform public.finish_poll(v_poll, 'completed');
end $$;

create or replace function public.fail_ai_job(p_job uuid, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare j public.ai_jobs;
begin
  select * into j from public.ai_jobs where id = p_job;
  if j.attempt >= 3 then
    update public.ai_jobs set status = 'failed', error = p_error, finished_at = now() where id = p_job;
    perform public.finish_poll(j.poll_id, 'failed_ai');
  else
    -- Backoff 1, 5, 15 minutes.
    update public.ai_jobs set status = 'queued', error = p_error,
      run_after = now() + (case j.attempt when 1 then interval '1 minute' when 2 then interval '5 minutes'
                            else interval '15 minutes' end)
    where id = p_job;
  end if;
end $$;

create or replace function public.finish_poll(p_poll uuid, p_status public.poll_status)
returns void language plpgsql security definer set search_path = '' as $$
declare pl public.polls;
begin
  update public.polls set status = p_status where id = p_poll and status in ('summarizing','failed_ai')
  returning * into pl;
  if pl.id is null then return; end if;
  perform public.notify(r.user_id, 'poll_ended', p_poll, jsonb_build_object('question', pl.question))
    from public.result_views r where r.poll_id = p_poll;
  if pl.creator_id is not null then
    perform public.notify(pl.creator_id, 'summary_ready', p_poll, jsonb_build_object('question', pl.question));
  end if;
end $$;

create or replace function public.retry_ai(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  update public.polls set status = 'summarizing' where id = p_poll and status = 'failed_ai';
  if found then insert into public.ai_jobs (poll_id) values (p_poll); end if;
end $$;

-- Results for voters and creators (STAGE4 §4) --------------------------------

create or replace function public.result_payload(p_poll uuid, p_user uuid, p_is_creator boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'poll_id', p.id,
    'question', p.question,
    'state', case when r.total_votes < 10 then 'not_enough_responses'
                  when p.status = 'summarizing' then 'summary_pending'
                  when p.status = 'failed_ai' then 'summary_failed' else 'ready' end,
    'total_votes', r.total_votes,
    'options', (select jsonb_agg(jsonb_build_object('side', o.side, 'label', o.label, 'image_path', o.image_path,
                  'pct', case o.side when 'a' then r.pct_a else r.pct_b end) order by o.side)
                from public.poll_options o where o.poll_id = p.id),
    'winner', r.winner,
    'you', case when p_is_creator then null else (
      select jsonb_build_object('side', v.side, 'in_majority', rv.in_majority,
                                'predicted_correctly', rv.predicted_correctly)
      from public.votes v join public.result_views rv on rv.poll_id = v.poll_id and rv.user_id = v.voter_id
      where v.poll_id = p.id and v.voter_id = p_user) end,
    'prediction', case when r.predicted_a_pct is not null then jsonb_build_object('a_pct', r.predicted_a_pct) end,
    'summary', case when r.summary_majority is not null then jsonb_build_object(
      'majority', r.summary_majority,
      'minority', r.summary_minority,
      'label', 'AI-generated from voters'' reasons. May be inaccurate.',
      'disclaimer', case when exists (select 1 from public.poll_target_categories t
                                      join public.categories c on c.id = t.category_id
                                      where t.poll_id = p.id and c.is_sensitive)
                    then 'Crowd opinions, not professional advice.' end) end,
    'featured', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'quote', f.quote, 'side', f.side) order by f.rank)
                 from public.featured_insights f where f.poll_id = p.id and not f.removed), '[]'),
    'view_once', not p_is_creator)
  from public.polls p join public.poll_results r on r.poll_id = p.id
  where p.id = p_poll;
$$;

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
  return public.result_payload(p_poll, auth.uid(), false);
end $$;

create or replace function public.mark_result_viewed(p_poll uuid)
returns void language sql security definer set search_path = '' as $$
  update public.result_views set viewed_at = coalesce(viewed_at, now())
  where poll_id = p_poll and user_id = auth.uid() and first_opened_at is not null;
$$;

create or replace function public.get_my_poll_result(p_poll uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not exists (select 1 from public.polls where id = p_poll and creator_id = auth.uid()) then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.result_payload(p_poll, auth.uid(), true);
end $$;

create or replace function public.get_results_ready()
returns table (id uuid, question text, closed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.closes_at from public.result_views rv join public.polls p on p.id = rv.poll_id
  where rv.user_id = auth.uid() and rv.viewed_at is null
    and p.status in ('completed','summarizing','failed_ai')
  order by p.closes_at desc;
end $$;

-- Profile & notifications (Phase 6) -----------------------------------------

create or replace function public.my_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u int;
begin
  perform public.require_user();
  u := public.credit_units(auth.uid());
  return jsonb_build_object(
    'polls_voted', (select count(*) from public.votes where voter_id = auth.uid()),
    'majority_pct', (select round(100.0 * count(*) filter (where in_majority) / nullif(count(in_majority), 0))
                     from public.result_views where user_id = auth.uid()),
    'featured_count', (select count(*) from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
                       where v.voter_id = auth.uid() and not f.removed),
    'top_categories', coalesce((select jsonb_agg(name) from (
        select c.name from public.votes v join public.poll_target_categories t on t.poll_id = v.poll_id
        join public.categories c on c.id = t.category_id
        where v.voter_id = auth.uid() group by c.name order by count(*) desc limit 3) x), '[]'),
    'credits', u,
    'polls_available', u / 3);
end $$;

create or replace function public.my_featured_insights()
returns table (quote text, question text, featured_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.quote, p.question, r.generated_at
  from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
  join public.polls p on p.id = f.poll_id join public.poll_results r on r.poll_id = f.poll_id
  where v.voter_id = auth.uid() and not f.removed
  order by r.generated_at desc;
$$;

create or replace function public.get_notifications()
returns table (id uuid, type public.notif_type, poll_id uuid, payload jsonb, read_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, type, poll_id, payload, read_at, created_at from public.notifications
  where user_id = auth.uid() order by created_at desc limit 100;
$$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- New-polls digest: hourly; users whose local hour equals their digest hour.
create or replace function public.queue_new_poll_digests()
returns void language plpgsql security definer set search_path = '' as $$
declare u record; n int;
begin
  for u in
    select np.user_id from public.notification_prefs np join public.profiles p on p.id = np.user_id
    where np.new_polls and p.status = 'active'
      and extract(hour from now() at time zone np.tz) = np.digest_hour
  loop
    select count(*) into n from public.polls pl
    where pl.status = 'active' and pl.moderation = 'approved' and pl.published_at > now() - interval '1 day'
      and exists (select 1 from public.audience_ids(pl.creator_id, pl.type,
                    coalesce((select array_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '{}'),
                    pl.age_min, pl.age_max, pl.community_id) a where a = u.user_id)
      and not exists (select 1 from public.votes v where v.poll_id = pl.id and v.voter_id = u.user_id);
    if n > 0 then
      perform public.notify(u.user_id, 'new_polls_digest', null, jsonb_build_object('count', n));
    end if;
  end loop;
end $$;

-- Retention (STAGE3 §10): raw reasons 90 days after close; notifications 60 days.
create or replace function public.run_retention()
returns void language sql security definer set search_path = '' as $$
  delete from public.reasons rs using public.votes v, public.polls p
  where rs.vote_id = v.id and v.poll_id = p.id and p.closes_at < now() - interval '90 days'
    and not exists (select 1 from public.featured_insights f where f.reason_vote_id = rs.vote_id);
  delete from public.notifications where created_at < now() - interval '60 days';
  delete from public.rate_limits where window_start < now() - interval '2 days';
  delete from public.campus_codes where expires_at < now();
  delete from public.user_communities m using public.communities c
  where m.community_id = c.id and c.kind = 'campus' and not exists (
    select 1 from public.campus_verifications cv
    where cv.user_id = m.user_id and cv.community_id = c.id and cv.expires_at > now());
$$;

-- Calls an Edge Function with the service key from Vault (secrets: project_url, service_role_key).
create or replace function public.invoke_edge(p_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  key text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key');
begin
  if url is null or key is null then return; end if;
  perform net.http_post(url || '/functions/v1/' || p_name, '{}'::jsonb, '{}'::jsonb,
    jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
end $$;

select cron.schedule('close-due-polls', '* * * * *', 'select public.close_due_polls()');
select cron.schedule('ai-worker', '* * * * *',
  $$select public.invoke_edge('ai-summary') where exists (select 1 from public.ai_jobs where status = 'queued' and run_after <= now())$$);
select cron.schedule('push-worker', '* * * * *',
  $$select public.invoke_edge('push') where exists (select 1 from public.notifications where sent_at is null)$$);
select cron.schedule('new-poll-digest', '0 * * * *', 'select public.queue_new_poll_digests()');
select cron.schedule('retention', '30 3 * * *', 'select public.run_retention()');

revoke execute on function public.notify, public.close_due_polls, public.claim_ai_jobs, public.complete_ai_job,
  public.fail_ai_job, public.finish_poll, public.result_payload, public.queue_new_poll_digests,
  public.run_retention, public.invoke_edge from public, anon, authenticated;
