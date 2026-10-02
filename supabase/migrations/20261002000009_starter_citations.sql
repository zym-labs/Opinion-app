-- Starter polls (try before sign-up) and per-point citations for AI summaries (STAGE6 v2).

-- 1. Starter polls: completed polls an admin picks to show newcomers before they sign up.
--    Practice votes on them are not stored.
alter table public.polls add column is_starter boolean not null default false;

-- 2. Summary points: [{side, text, reason_ids[]}]. reason_ids are vote ids and never leave the server.
alter table public.poll_results add column summary_points jsonb;

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
    'you', case when p_is_creator or p_user is null then null else (
      select jsonb_build_object('side', v.side, 'in_majority', rv.in_majority,
                                'predicted_correctly', rv.predicted_correctly)
      from public.votes v join public.result_views rv on rv.poll_id = v.poll_id and rv.user_id = v.voter_id
      where v.poll_id = p.id and v.voter_id = p_user) end,
    'prediction', case when r.predicted_a_pct is not null then jsonb_build_object('a_pct', r.predicted_a_pct) end,
    'summary', case when r.summary_majority is not null then jsonb_build_object(
      'majority', r.summary_majority,
      'minority', r.summary_minority,
      -- Each point carries how many reasons back it and which featured quotes (if any) it draws on.
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

-- AI worker now also stores the points (old signature dropped).
drop function public.complete_ai_job(uuid, text, text, jsonb, text, int, int, int);
create or replace function public.complete_ai_job(
  p_job uuid, p_majority text, p_minority text, p_featured jsonb, p_model text,
  p_tokens_in int, p_tokens_out int, p_reason_count int, p_points jsonb default null)
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
    summary_points = p_points, summary_model = p_model, summary_version = 2, generated_at = now()
  where poll_id = v_poll;
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
revoke execute on function public.complete_ai_job from public, anon, authenticated;

-- Starter polls for logged-out newcomers: results only, no identities, nothing per-voter.
create or replace function public.get_starter_polls()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.payload || jsonb_build_object('type', x.type, 'is_taste', x.is_taste,
                                                          'view_once', false, 'you', null)
                            order by x.created_at), '[]')
  from (select p.type, p.is_taste, p.created_at, public.result_payload(p.id, null, true) as payload
        from public.polls p
        where p.is_starter and p.status = 'completed' and p.moderation = 'approved'
        order by p.created_at desc limit 3) x
  where x.payload->>'state' = 'ready';
$$;
grant execute on function public.get_starter_polls() to anon, authenticated;

create or replace function public.admin_set_starter(p_poll uuid, p_starter boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin();
begin
  update public.polls set is_starter = p_starter where id = p_poll and status = 'completed';
  if not found then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  insert into public.moderation_actions (admin_id, poll_id, action, note)
  values (v_admin, p_poll, 'restore', case when p_starter then 'set starter' else 'unset starter' end);
end $$;
grant execute on function public.admin_set_starter(uuid, boolean) to authenticated;

create or replace function public.admin_completed_polls(p_limit int default 50)
returns table (id uuid, question text, total_votes int, is_starter boolean, closes_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.question, r.total_votes, p.is_starter, p.closes_at
  from public.polls p join public.poll_results r on r.poll_id = p.id
  where p.status = 'completed' and r.summary_majority is not null and p.moderation = 'approved'
  order by p.is_starter desc, p.closes_at desc limit p_limit;
end $$;
grant execute on function public.admin_completed_polls(int) to authenticated;
