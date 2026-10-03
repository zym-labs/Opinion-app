-- Phase 5: Relationships topic, campus safety partnership, assistant (MCP) helpers.

-- 1. Relationships topic with extra care --------------------------------------------------------------
alter table public.categories add column safety_note text;
insert into public.categories (slug, name, is_sensitive, sort)
values ('relationships', 'Relationships', true, 90)
on conflict (slug) do update set is_sensitive = true;
update public.categories
set safety_note = 'Keep it about the situation, not the person: no names, screenshots or details that identify anyone. If a relationship feels controlling or unsafe, talk to someone you trust or a support line.'
where slug = 'relationships';

-- 2. Campus safety partnership -----------------------------------------------------------------------
-- Universities can give their students a local support line; it appears on the crisis card for members.
-- Crisis-card views are counted per day and campus (no user ids) so partners see whether support is used.
alter table public.communities add column support_name text, add column support_phone text, add column support_url text;

create table public.crisis_counts (
  day          date not null default current_date,
  community_id uuid references public.communities on delete cascade,
  n            int not null default 0
);
create unique index crisis_counts_key on public.crisis_counts (day, coalesce(community_id, '00000000-0000-0000-0000-000000000000'));
alter table public.crisis_counts enable row level security;
revoke all on public.crisis_counts from anon, authenticated;

-- Called by Edge Functions when the crisis safety net triggers. Stores no identity.
create or replace function public.record_crisis(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.crisis_counts (day, community_id, n)
  select current_date, c, 1 from (
    select m.community_id as c from public.user_communities m join public.communities co on co.id = m.community_id
    where m.user_id = p_user and co.kind = 'campus'
    union all select null where not exists (
      select 1 from public.user_communities m join public.communities co on co.id = m.community_id
      where m.user_id = p_user and co.kind = 'campus')) x
  on conflict (day, coalesce(community_id, '00000000-0000-0000-0000-000000000000')) do update set n = public.crisis_counts.n + 1;
$$;
revoke execute on function public.record_crisis(uuid) from public, anon, authenticated;

create or replace function public.my_campus_support()
returns table (community text, name text, phone text, url text)
language sql stable security definer set search_path = '' as $$
  select c.name, c.support_name, c.support_phone, c.support_url
  from public.user_communities m join public.communities c on c.id = m.community_id
  where m.user_id = auth.uid() and c.kind = 'campus' and (c.support_phone is not null or c.support_url is not null);
$$;
revoke execute on function public.my_campus_support() from public, anon;
grant execute on function public.my_campus_support() to authenticated;

create or replace function public.admin_set_community_support(p_community uuid, p_name text, p_phone text, p_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_url is not null and p_url !~ '^https://' then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  update public.communities set support_name = nullif(trim(p_name), ''), support_phone = nullif(trim(p_phone), ''),
    support_url = nullif(trim(p_url), '') where id = p_community;
end $$;

-- What a university partner receives: totals only, small numbers suppressed.
create or replace function public.admin_campus_report(p_community uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
  sup int := 5;
  crisis int;
begin
  perform public.require_admin();
  select coalesce(sum(n), 0) into crisis from public.crisis_counts where community_id = p_community and day >= since::date;
  return jsonb_build_object(
    'community', (select name from public.communities where id = p_community),
    'period_days', p_days,
    'members', (select count(*) from public.user_communities where community_id = p_community),
    'polls', (select count(*) from public.polls where community_id = p_community and published_at >= since),
    'votes', (select coalesce(sum(vote_count), 0) from public.polls where community_id = p_community and published_at >= since),
    'reports', (select count(*) from public.reports r join public.polls p on p.id = r.poll_id
                where p.community_id = p_community and r.created_at >= since),
    'removals', (select count(*) from public.moderation_actions m join public.polls p on p.id = m.poll_id
                 where p.community_id = p_community and m.action = 'remove' and m.created_at >= since),
    'crisis_support_shown', case when crisis < sup then 'fewer than 5' else crisis::text end,
    'support_line_set', exists (select 1 from public.communities where id = p_community and support_phone is not null));
end $$;
revoke execute on function public.admin_set_community_support(uuid, text, text, text), public.admin_campus_report(uuid, int) from public, anon;
grant execute on function public.admin_set_community_support(uuid, text, text, text), public.admin_campus_report(uuid, int) to authenticated;

-- 3. Assistant (MCP) helpers, called by the mcp Edge Function with the signed-in user's id ----------------
create or replace function public.mcp_topics(p_user uuid)
returns table (slug text, name text)
language sql stable security definer set search_path = '' as $$
  select c.slug, c.name from public.user_categories uc join public.categories c on c.id = uc.category_id
  where uc.user_id = p_user order by c.sort;
$$;

create or replace function public.mcp_my_polls(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
    select jsonb_build_object(
      'id', p.id, 'question', p.question, 'status', p.status, 'votes', p.vote_count,
      'closes_at', p.closes_at, 'created_at', p.created_at,
      'result', case when p.status in ('completed', 'failed_ai') then
        public.result_payload(p.id, null, true) - 'featured' - 'ai_take' - 'poll_id' - 'view_once' end) x
    from public.polls p where p.creator_id = p_user and p.status <> 'deleted' and p.daily_on is null
    order by p.created_at desc limit 10) s;
$$;
revoke execute on function public.mcp_topics(uuid), public.mcp_my_polls(uuid) from public, anon, authenticated;
