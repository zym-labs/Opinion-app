-- Admin review fixes (2026-10-02).

-- 1. Queue: pick one row per reported item, THEN order by severity and age before limiting,
--    so a large backlog never hides the most severe or oldest reports.
create or replace function public.admin_queue(p_status public.report_status default 'open', p_limit int default 100)
returns table (report_id uuid, target_type public.report_target, target_id uuid, poll_id uuid, reason public.report_reason,
               severity smallint, created_at timestamptz, report_count bigint, preview text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select q.* from (
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
  ) q
  order by q.severity desc, q.created_at
  limit p_limit;
end $$;

-- 2. Admins see archived categories too (the client policy hides them).
create or replace function public.admin_list_categories()
returns table (id smallint, slug text, name text, is_sensitive boolean, archived boolean, sort smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select c.id, c.slug, c.name, c.is_sensitive, c.archived, c.sort from public.categories c order by c.sort;
end $$;
revoke execute on function public.admin_list_categories() from public, anon;
grant execute on function public.admin_list_categories() to authenticated;

-- 5. Moderators can view images of any poll (removed and draft ones included) while reviewing.
create policy "admins read all poll images" on storage.objects for select to authenticated
using (
  bucket_id = 'poll-images' and coalesce((select is_admin from public.profiles where id = auth.uid()), false)
);

-- 6. Seed polls validate their duration like every other poll.
create or replace function public.admin_seed_poll(
  p_type public.poll_type, p_question text, p_label_a text, p_label_b text, p_categories smallint[],
  p_community uuid, p_hours smallint, p_is_taste boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid;
begin
  if p_hours is null or p_hours < 3 or p_hours > 24 then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
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
