-- One of the creator's own polls by id (the My Polls list is capped at 100).
create or replace function public.get_my_poll(p_poll uuid)
returns table (id uuid, question text, type public.poll_type, status public.poll_status,
               vote_count int, closes_at timestamptz, created_at timestamptz, removed_reason text,
               parent_poll_id uuid, follow_up_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.type, p.status, p.vote_count, p.closes_at, p.created_at, p.removed_reason,
    p.parent_poll_id,
    (select count(*)::int from public.polls f where f.parent_poll_id = p.id and f.status not in ('draft','deleted'))
  from public.polls p
  where p.id = p_poll and p.creator_id = auth.uid() and p.status <> 'deleted';
end $$;
revoke execute on function public.get_my_poll(uuid) from public, anon;
grant execute on function public.get_my_poll(uuid) to authenticated;
