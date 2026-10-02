-- Review fixes, round 2 (2026-10-02).

-- 1. Reason counts must survive retention (raw reasons are deleted 90 days after close).
alter table public.votes add column gave_reason boolean not null default false;
alter table public.poll_results add column reason_count int;
update public.votes v set gave_reason = true where exists (select 1 from public.reasons r where r.vote_id = v.id);

create or replace function public.mark_gave_reason() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.votes set gave_reason = true where id = new.vote_id;
  return new;
end $$;
revoke execute on function public.mark_gave_reason() from public, anon, authenticated;
create trigger mark_gave_reason after insert on public.reasons
  for each row execute function public.mark_gave_reason();

-- Approved reasons counted once, when the summary is written; result_payload prefers the stored value.
create or replace function public.store_reason_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'succeeded' and old.status <> 'succeeded' then
    update public.poll_results set reason_count = new.input_reason_count where poll_id = new.poll_id;
  end if;
  return new;
end $$;
revoke execute on function public.store_reason_count() from public, anon, authenticated;
create trigger store_reason_count after update of status on public.ai_jobs
  for each row execute function public.store_reason_count();

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
    'reason_count', coalesce(r.reason_count,
                     (select count(*) from public.votes v join public.reasons rs on rs.vote_id = v.id
                      where v.poll_id = p.id and rs.moderation = 'approved')),
    'view_once', not p_is_creator)
  from public.polls p join public.poll_results r on r.poll_id = p.id
  where p.id = p_poll;
$$;
revoke execute on function public.result_payload from public, anon, authenticated;

-- Insights count "explained their vote" from the durable flag, not the deletable reasons table.
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
  select count(*), count(*) filter (where v.gave_reason), count(*) filter (where v.feature_consent),
         count(*) filter (where v.predicted_side is not null), count(*) filter (where v.predicted_side = w)
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

-- 2. AI jobs left 'running' by a crashed or timed-out worker are retried (or failed after 3 attempts).
create or replace function public.requeue_stuck_ai_jobs()
returns void language plpgsql security definer set search_path = '' as $$
declare j record;
begin
  for j in select id from public.ai_jobs where status = 'running' and started_at < now() - interval '10 minutes' loop
    perform public.fail_ai_job(j.id, 'worker timed out');
  end loop;
end $$;
revoke execute on function public.requeue_stuck_ai_jobs() from public, anon, authenticated;
select cron.schedule('ai-stuck-jobs', '*/5 * * * *', 'select public.requeue_stuck_ai_jobs()');

-- 4. Digest: compute each recent poll's audience once (polls × users), not once per user per poll.
create or replace function public.queue_new_poll_digests()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(m.user_id, 'new_polls_digest', null, jsonb_build_object('count', m.n))
  from (
    select a.user_id, count(*) as n
    from public.polls pl
    cross join lateral public.audience_ids(pl.creator_id, pl.type,
      coalesce((select array_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '{}'),
      pl.age_min, pl.age_max, pl.community_id) as a(user_id)
    where pl.status = 'active' and pl.moderation = 'approved' and pl.published_at > now() - interval '1 day'
      and not exists (select 1 from public.votes v where v.poll_id = pl.id and v.voter_id = a.user_id)
    group by a.user_id
  ) m
  join public.notification_prefs np on np.user_id = m.user_id
  where np.new_polls and extract(hour from now() at time zone np.tz) = np.digest_hour;
end $$;
revoke execute on function public.queue_new_poll_digests() from public, anon, authenticated;

-- 5. Verified-expert split uses the same k = 10 as every other group.
create or replace function public.verified_breakdown(p_poll uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as (select side from public.votes where poll_id = p_poll and verified_expert)
  select case when (select count(*) from v) < 10 then null else jsonb_build_object(
    'total', (select count(*) from v),
    'pcts', (select jsonb_object_agg(o.side, round(100.0 * (select count(*) from v where v.side = o.side) / (select count(*) from v), 1))
             from public.poll_options o where o.poll_id = p_poll)) end;
$$;
revoke execute on function public.verified_breakdown(uuid) from public, anon, authenticated;

-- 6. Logged-out newcomers can load images of starter polls (and nothing else).
create policy "anyone reads starter poll images" on storage.objects for select to anon
using (
  bucket_id = 'poll-images' and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.is_starter and p.status = 'completed' and p.moderation = 'approved')
);

-- 10. One owner for expert-code cleanup (expire_expert_verifications already does it).
create or replace function public.run_retention_extra()
returns void language sql security definer set search_path = '' as $$
  delete from public.integrity_events where created_at < now() - interval '90 days';
  delete from public.integrity_challenges where expires_at < now();
$$;
revoke execute on function public.run_retention_extra() from public, anon, authenticated;
