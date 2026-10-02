-- Polls with 2–4 options. Results move to jsonb maps keyed by option side; the old a/b
-- columns stay filled for compatibility. "Majority" is the top option; "minority" is everyone else.

alter table public.poll_results add column counts jsonb, add column pcts jsonb;

-- Creation takes 2–4 labels (null = image-only option).
drop function public.create_poll_draft(uuid, public.poll_type, boolean, text, text, text, smallint[], smallint, smallint, uuid, smallint, public.moderation_state);
create or replace function public.create_poll_draft(
  p_user uuid, p_type public.poll_type, p_is_taste boolean, p_question text,
  p_labels text[], p_categories smallint[], p_age_min smallint, p_age_max smallint,
  p_community uuid, p_duration smallint, p_moderation public.moderation_state)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  n int := coalesce(array_length(p_categories, 1), 0);
  k int := coalesce(array_length(p_labels, 1), 0);
  sides public.vote_side[] := array['a','b','c','d']::public.vote_side[];
begin
  perform public.hit_rate_limit(p_user, 'draft', 10, interval '1 day');
  if k < 2 or k > 4 then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
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
  -- Image-only options get a placeholder label until the Edge Function attaches the image path.
  insert into public.poll_options (poll_id, side, label, image_path)
  select v_id, sides[i], p_labels[i], case when p_labels[i] is null then 'pending' end
  from generate_subscripts(p_labels, 1) i;
  if p_type = 'expert' then
    insert into public.poll_target_categories (poll_id, category_id) select v_id, unnest(p_categories);
  end if;
  return v_id;
end $$;
revoke execute on function public.create_poll_draft from public, anon, authenticated;

-- Votes must pick one of the poll's own options.
create or replace function public.check_vote_side() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.poll_options where poll_id = new.poll_id and side = new.side) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  if new.predicted_side is not null and not exists (
    select 1 from public.poll_options where poll_id = new.poll_id and side = new.predicted_side) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger check_vote_side before insert on public.votes
  for each row execute function public.check_vote_side();

-- Closing: generic counts over any number of options.
create or replace function public.close_due_polls()
returns int language plpgsql security definer set search_path = '' as $$
declare
  pl record;
  t int; pn int;
  c jsonb; pc jsonb; top_n int; tops int;
  w public.vote_side;
  pa numeric;
  closed int := 0;
begin
  for pl in
    select * from public.polls where status = 'active' and closes_at <= now() for update skip locked
  loop
    update public.polls set status = 'closing' where id = pl.id;
    select coalesce(jsonb_object_agg(o.side, (select count(*) from public.votes v where v.poll_id = pl.id and v.side = o.side)), '{}')
      into c from public.poll_options o where o.poll_id = pl.id;
    t := (select coalesce(sum(value::int), 0) from jsonb_each_text(c));
    select max(value::int), count(*) filter (where value::int = (select max(value::int) from jsonb_each_text(c)))
      into top_n, tops from jsonb_each_text(c);
    w := case when t < 10 or tops > 1 then null
              else (select key::public.vote_side from jsonb_each_text(c) where value::int = top_n limit 1) end;
    pc := case when t >= 10 then (select jsonb_object_agg(key, round(100.0 * value::int / t, 2)) from jsonb_each_text(c)) end;
    select count(*) filter (where predicted_side is not null) into pn from public.votes where poll_id = pl.id;
    pa := case when t >= 10 and pn > 0 then
            round(100.0 * (select count(*) from public.votes where poll_id = pl.id and predicted_side = 'a') / pn, 2) end;

    insert into public.poll_results (poll_id, total_votes, votes_a, votes_b, pct_a, pct_b, winner, predicted_a_pct, counts, pcts)
    values (pl.id, t,
      case when t >= 10 then (c->>'a')::int end, case when t >= 10 then (c->>'b')::int end,
      (pc->>'a')::numeric, (pc->>'b')::numeric, w, pa,
      case when t >= 10 then c end, pc)
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

  update public.result_views set viewed_at = now()
  where viewed_at is null and first_opened_at < now() - interval '5 minutes';
  return closed;
end $$;
revoke execute on function public.close_due_polls from public, anon, authenticated;

-- AI worker input: all options with their vote counts.
drop function public.claim_ai_jobs(int);
create or replace function public.claim_ai_jobs(p_limit int default 5)
returns table (job_id uuid, poll_id uuid, attempt smallint, question text, is_sensitive boolean,
               options jsonb, reasons jsonb)
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
      where v.poll_id = p.id and rs.moderation = 'approved' and not rs.injection_flag), '[]')
  from claimed c join public.polls p on p.id = c.poll_id join public.poll_results r on r.poll_id = p.id;
end $$;
revoke execute on function public.claim_ai_jobs from public, anon, authenticated;

-- Result payload: percentages for every option.
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
                  'pct', coalesce((r.pcts->>o.side::text)::numeric,
                                  case o.side when 'a' then r.pct_a when 'b' then r.pct_b end)) order by o.side)
                from public.poll_options o where o.poll_id = p.id),
    'winner', r.winner,
    'you', case when p_is_creator or p_user is null then null else (
      select jsonb_build_object('side', v.side, 'in_majority', rv.in_majority,
                                'predicted_correctly', rv.predicted_correctly)
      from public.votes v join public.result_views rv on rv.poll_id = v.poll_id and rv.user_id = v.voter_id
      where v.poll_id = p.id and v.voter_id = p_user) end,
    'prediction', case when r.predicted_a_pct is not null then jsonb_build_object('a_pct', r.predicted_a_pct) end,
    'summary', case when r.summary_majority is not null then jsonb_build_object(
      'majority', r.summary_majority,
      'minority', r.summary_minority,
      'points', (select jsonb_agg(jsonb_build_object(
          'side', pt->>'side',
          'text', pt->>'text',
          'reason_count', jsonb_array_length(coalesce(pt->'reason_ids', '[]')),
          'quote_ids', coalesce((select jsonb_agg(f.id order by f.rank) from public.featured_insights f
                                 where f.poll_id = p.id and not f.removed
                                   and f.reason_vote_id::text in (select jsonb_array_elements_text(pt->'reason_ids'))), '[]'))
          order by ord)
        from jsonb_array_elements(r.summary_points) with ordinality as x(pt, ord)),
      'label', 'AI-generated from voters'' reasons. May be inaccurate.',
      'disclaimer', case when exists (select 1 from public.poll_target_categories t
                                      join public.categories c on c.id = t.category_id
                                      where t.poll_id = p.id and c.is_sensitive)
                    then 'Crowd opinions, not professional advice.' end) end,
    'featured', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'quote', f.quote, 'side', f.side) order by f.rank)
                 from public.featured_insights f where f.poll_id = p.id and not f.removed), '[]'),
    'reason_count', (select count(*) from public.votes v join public.reasons rs on rs.vote_id = v.id
                     where v.poll_id = p.id and rs.moderation = 'approved'),
    'view_once', not p_is_creator)
  from public.polls p join public.poll_results r on r.poll_id = p.id
  where p.id = p_poll;
$$;
revoke execute on function public.result_payload from public, anon, authenticated;
