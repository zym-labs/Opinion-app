-- Follow-up polls (roadmap): an asker can follow up on their own completed poll. The follow-up
-- shows "Follow-up to: …" and the original poll's voters are told when it goes live.

alter table public.polls add column parent_poll_id uuid references public.polls on delete set null;
create index on public.polls (parent_poll_id) where parent_poll_id is not null;

-- Links a draft to its parent; only the same creator, only completed parents.
create or replace function public.set_follow_up_parent(p_user uuid, p_poll uuid, p_parent uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.polls where id = p_parent and creator_id = p_user and status in ('completed','failed_ai')) then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.polls set parent_poll_id = p_parent where id = p_poll and creator_id = p_user and status = 'draft';
end $$;
revoke execute on function public.set_follow_up_parent(uuid, uuid, uuid) from public, anon, authenticated;

-- Template for the create screen: same audience as the parent.
create or replace function public.get_follow_up_template(p_parent uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pl public.polls;
begin
  perform public.require_user();
  select * into pl from public.polls where id = p_parent and creator_id = auth.uid() and status in ('completed','failed_ai');
  if pl.id is null then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'question', pl.question, 'type', pl.type, 'is_taste', pl.is_taste,
    'community_id', pl.community_id, 'age_min', pl.age_min, 'age_max', pl.age_max,
    'category_ids', coalesce((select jsonb_agg(category_id) from public.poll_target_categories where poll_id = pl.id), '[]'));
end $$;
revoke execute on function public.get_follow_up_template(uuid) from public, anon;
grant execute on function public.get_follow_up_template(uuid) to authenticated;

-- When a follow-up goes live, the parent's voters hear about it (if they can still see it).
create or replace function public.notify_follow_up() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cats smallint[];
begin
  if new.status = 'active' and old.status = 'draft' and new.parent_poll_id is not null then
    select coalesce(array_agg(category_id), '{}') into cats from public.poll_target_categories where poll_id = new.id;
    perform public.notify(v.voter_id, 'follow_up', new.id, jsonb_build_object('question', new.question))
    from public.votes v
    where v.poll_id = new.parent_poll_id and v.voter_id is not null
      and v.voter_id in (select public.audience_ids(new.creator_id, new.type, cats, new.age_min, new.age_max, new.community_id));
  end if;
  return new;
end $$;
revoke execute on function public.notify_follow_up() from public, anon, authenticated;
create trigger notify_follow_up after update of status on public.polls
  for each row execute function public.notify_follow_up();

-- Feed and vote screen show the parent question.
drop function public.get_poll_for_vote(uuid);
drop function public.get_feed(int, timestamptz, uuid, uuid, int);

create or replace function public.get_feed(
  p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
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
     from public.poll_options o where o.poll_id = p.id),
    (p.vote_count >= 10)::int,
    (select pp.question from public.polls pp where pp.id = p.parent_poll_id)
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
    and (p_after_closes is null
         or ((p.vote_count >= 10)::int, p.closes_at, p.id) > (coalesce(p_after_bucket, 0), p_after_closes, p_after_id))
    and (p_only is null or p.id = p_only)
  order by (p.vote_count >= 10)::int, p.closes_at, p.id
  limit least(p_limit, 50);
end $$;
revoke execute on function public.get_feed(int, timestamptz, uuid, uuid, int) from public, anon;
grant execute on function public.get_feed(int, timestamptz, uuid, uuid, int) to authenticated;

create or replace function public.get_poll_for_vote(p_poll uuid)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language sql stable security definer set search_path = '' as $$
  select * from public.get_feed(1, null, null, p_poll);
$$;
revoke execute on function public.get_poll_for_vote(uuid) from public, anon;
grant execute on function public.get_poll_for_vote(uuid) to authenticated;

-- Creator's poll list shows follow-up links.
drop function public.get_my_polls(boolean);
create or replace function public.get_my_polls(p_completed boolean)
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
  where p.creator_id = auth.uid() and p.status <> 'deleted'
    and (case when p_completed then p.status in ('completed','failed_ai','removed')
              else p.status in ('draft','active','closing','summarizing') end)
  order by p.created_at desc limit 100;
end $$;
revoke execute on function public.get_my_polls(boolean) from public, anon;
grant execute on function public.get_my_polls(boolean) to authenticated;
