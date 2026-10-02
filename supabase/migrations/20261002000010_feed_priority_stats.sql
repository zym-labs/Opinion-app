-- STAGE6 v2 P1/P2: polls short of votes come first in the feed; private mastery stats.

-- Feed order: polls still under the 10-vote result threshold first (so every asker gets answers),
-- then soonest closing. The cursor carries the bucket so paging stays correct.
drop function public.get_poll_for_vote(uuid);
drop function public.get_feed(int, timestamptz, uuid, uuid);

create or replace function public.get_feed(
  p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int)
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
    (p.vote_count >= 10)::int
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
               target_label text, is_sensitive boolean, options jsonb, bucket int)
language sql stable security definer set search_path = '' as $$
  select * from public.get_feed(1, null, null, p_poll);
$$;
revoke execute on function public.get_poll_for_vote(uuid) from public, anon;
grant execute on function public.get_poll_for_vote(uuid) to authenticated;

-- Private mastery stats (no public counts): majority matches, contrarian picks, predictions, quotes.
create or replace function public.my_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u int;
begin
  perform public.require_user();
  u := public.credit_units(auth.uid());
  return (
    with rv as (select * from public.result_views where user_id = auth.uid())
    select jsonb_build_object(
      'polls_voted', (select count(*) from public.votes where voter_id = auth.uid()),
      'decided', (select count(*) from rv where in_majority is not null),
      'majority_matches', (select count(*) from rv where in_majority),
      'majority_pct', (select round(100.0 * count(*) filter (where in_majority) / nullif(count(in_majority), 0)) from rv),
      'contrarian_picks', (select count(*) from rv where in_majority = false),
      'predictions_right', (select count(*) from rv where predicted_correctly),
      'predictions_made', (select count(*) from rv where predicted_correctly is not null),
      'featured_count', (select count(*) from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
                         where v.voter_id = auth.uid() and not f.removed),
      'top_categories', coalesce((select jsonb_agg(name) from (
          select c.name from public.votes v join public.poll_target_categories t on t.poll_id = v.poll_id
          join public.categories c on c.id = t.category_id
          where v.voter_id = auth.uid() group by c.name order by count(*) desc limit 3) x), '[]'),
      'credits', u,
      'polls_available', u / 3));
end $$;
