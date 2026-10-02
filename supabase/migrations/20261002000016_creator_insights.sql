-- Creator insights (roadmap: analytics). Private to the poll's creator, completed polls only.
-- Every group needs at least 10 votes or it is left out (k-anonymity). No per-vote data and no
-- timings (vote timestamps are never exposed).

-- Option percentages among verified (true) or self-selected (false) voters; null below 10 votes.
create or replace function public.insight_group_pcts(p_poll uuid, p_verified boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as (select side from public.votes where poll_id = p_poll and verified_expert = p_verified)
  select case when (select count(*) from v) < 10 then null else
    (select jsonb_object_agg(o.side, round(100.0 * (select count(*) from v where v.side = o.side) / (select count(*) from v), 1))
     from public.poll_options o where o.poll_id = p_poll) end;
$$;
revoke execute on function public.insight_group_pcts(uuid, boolean) from public, anon, authenticated;

create or replace function public.get_poll_insights(p_poll uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  k constant int := 10;
  pl public.polls;
  w public.vote_side;
  total int; reasons int; consents int; made int; right_n int;
begin
  perform public.require_user();
  select * into pl from public.polls where id = p_poll and creator_id = auth.uid();
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  if pl.status not in ('completed', 'failed_ai') then raise exception 'RESULT_NOT_READY' using errcode = 'P0001'; end if;

  select winner into w from public.poll_results where poll_id = p_poll;
  select count(*),
         count(*) filter (where exists (select 1 from public.reasons r where r.vote_id = v.id)),
         count(*) filter (where v.feature_consent),
         count(*) filter (where v.predicted_side is not null),
         count(*) filter (where v.predicted_side = w)
    into total, reasons, consents, made, right_n
  from public.votes v where v.poll_id = p_poll;

  return jsonb_build_object(
    'total', total,
    'min_group', k,
    'with_reason_pct', case when total >= k then round(100.0 * reasons / total) end,
    'quote_consent_pct', case when total >= k then round(100.0 * consents / total) end,
    'verified', public.insight_group_pcts(p_poll, true),
    'self_selected', public.insight_group_pcts(p_poll, false),
    'predictions', case when made >= k then jsonb_build_object(
      'made', made,
      'right_pct', case when w is null then null else round(100.0 * right_n / made) end,
      'expected', (select jsonb_object_agg(o.side,
                     round(100.0 * (select count(*) from public.votes v where v.poll_id = p_poll and v.predicted_side = o.side) / made))
                   from public.poll_options o where o.poll_id = p_poll)) end);
end $$;
revoke execute on function public.get_poll_insights(uuid) from public, anon;
grant execute on function public.get_poll_insights(uuid) to authenticated;
