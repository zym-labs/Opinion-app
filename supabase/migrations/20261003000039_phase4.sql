-- Phase 4: bridging quotes, decision areas, 10/10/10 notes, AI second opinion, impact recap,
-- privacy dashboard, Room mode, sponsored cap, transparency report.

alter table public.poll_results add column ai_take jsonb;  -- used below (section 4)

-- 1. Bridging: quotes marked helpful by voters on BOTH sides come first ---------------------------
-- (Community Notes-style: fair beats popular.) Reactions are grouped by the reactor's own vote.
create or replace function public.bridging_score(p_insight uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(least(
    count(*) filter (where v.side = r.winner),
    count(*) filter (where v.side is distinct from r.winner and v.side is not null)), 0)::int
  from public.insight_reactions x
  join public.featured_insights f on f.id = x.insight_id
  join public.poll_results r on r.poll_id = f.poll_id
  left join public.votes v on v.poll_id = f.poll_id and v.voter_id = x.user_id
  where x.insight_id = p_insight;
$$;
revoke execute on function public.bridging_score(uuid) from public, anon, authenticated;

-- Same payload as before; featured quotes ordered by bridging score, then the AI's rank.
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
    'featured', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'quote', f.quote, 'side', f.side,
                    'bridging', public.bridging_score(f.id) >= 2)
                  order by public.bridging_score(f.id) desc, f.rank)
                 from public.featured_insights f where f.poll_id = p.id and not f.removed), '[]'),
    'reason_count', coalesce(r.reason_count,
                     (select count(*) from public.votes v join public.reasons rs on rs.vote_id = v.id
                      where v.poll_id = p.id and rs.moderation = 'approved')),
    'ai_take', case when p_is_creator then r.ai_take end,
    'view_once', not p_is_creator)
  from public.polls p join public.poll_results r on r.poll_id = p.id
  where p.id = p_poll;
$$;
revoke execute on function public.result_payload from public, anon, authenticated;

-- 2. What people are deciding about (personalises templates and the daily question mix) -----------
alter table public.profiles add column decision_areas text[] not null default '{}'
  check (decision_areas <@ array['study','career','relationships','money','style','everyday','health','home']);

create or replace function public.set_decision_areas(p_areas text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user(false);
  if not (p_areas <@ array['study','career','relationships','money','style','everyday','health','home']) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  update public.profiles set decision_areas = p_areas where id = auth.uid();
end $$;
create or replace function public.my_decision_areas()
returns text[] language sql stable security definer set search_path = '' as $$
  select decision_areas from public.profiles where id = auth.uid();
$$;
revoke execute on function public.set_decision_areas(text[]), public.my_decision_areas() from public, anon;
grant execute on function public.set_decision_areas(text[]), public.my_decision_areas() to authenticated;

-- 3. "Think it through" notes (private to the asker) ----------------------------------------------
alter table public.polls add column reflection jsonb;

create or replace function public.save_reflection(p_poll uuid, p_notes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  if jsonb_typeof(p_notes) <> 'object' or length(p_notes::text) > 2000 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  update public.polls set reflection = p_notes where id = p_poll and creator_id = auth.uid();
  if not found then raise exception 'POLL_NOT_FOUND' using errcode = 'P0001'; end if;
end $$;
revoke execute on function public.save_reflection(uuid, jsonb) from public, anon;
grant execute on function public.save_reflection(uuid, jsonb) to authenticated;

-- Journal gains the notes and the AI's take.
drop function public.my_journal();
create or replace function public.my_journal()
returns table (poll_id uuid, question text, closed_at timestamptz, total_votes int, winner text, winner_pct numeric,
               chose text, decision_none boolean, decision_helpful boolean, decided_at timestamptz,
               followed_crowd boolean, checkin_glad boolean, checkin_due boolean, reflection jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  return query
  select p.id, p.question, p.closes_at, r.total_votes,
    (select o.label from public.poll_options o where o.poll_id = p.id and o.side = r.winner),
    (r.pcts->>r.winner::text)::numeric,
    (select o.label from public.poll_options o where o.poll_id = p.id and o.side = p.decision_side),
    p.decision_none, p.decision_helpful, p.decided_at,
    case when p.decision_side is null or r.winner is null then null else p.decision_side = r.winner end,
    p.checkin_glad,
    p.decided_at is not null and not coalesce(p.decision_none, false) and p.checkin_at is null
      and p.decided_at < now() - interval '30 days',
    p.reflection
  from public.polls p left join public.poll_results r on r.poll_id = p.id
  where p.creator_id = auth.uid() and p.status in ('completed', 'failed_ai') and p.daily_on is null
  order by p.closes_at desc limit 200;
end $$;
revoke execute on function public.my_journal() from public, anon;
grant execute on function public.my_journal() to authenticated;

-- 4. AI second opinion (asker only, once per poll, written by the second-opinion function) ---------
create or replace function public.claim_ai_take(p_user uuid, p_poll uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j jsonb;
begin
  if not exists (select 1 from public.polls where id = p_poll and creator_id = p_user and status = 'completed') then
    raise exception 'POLL_NOT_FOUND' using errcode = 'P0001';
  end if;
  select ai_take into j from public.poll_results where poll_id = p_poll;
  if j is not null then return jsonb_build_object('cached', j); end if;
  perform public.hit_rate_limit(p_user, 'ai_take', 10, interval '1 day');
  return public.result_payload(p_poll, null, true) - 'featured' - 'ai_take';
end $$;
create or replace function public.store_ai_take(p_poll uuid, p_take jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.poll_results set ai_take = p_take where poll_id = p_poll and ai_take is null;
$$;
revoke execute on function public.claim_ai_take(uuid, uuid), public.store_ai_take(uuid, jsonb) from public, anon, authenticated;

-- 5. Impact recap, milestones and calibration ----------------------------------------------------------
create or replace function public.my_impact(p_days int default 30)
returns table (votes int, reasons_quoted int, helpful_marks int, askers_followed int, predictions int,
               predictions_right int, total_votes int)
language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 366));
begin
  perform public.require_user();
  return query select
    (select count(*)::int from public.votes v where v.voter_id = auth.uid() and v.created_at >= since),
    (select count(*)::int from public.featured_insights f join public.votes v on v.id = f.reason_vote_id
     join public.poll_results r on r.poll_id = f.poll_id
     where v.voter_id = auth.uid() and not f.removed and r.generated_at >= since),
    (select count(*)::int from public.insight_reactions x join public.featured_insights f on f.id = x.insight_id
     join public.votes v on v.id = f.reason_vote_id where v.voter_id = auth.uid() and x.created_at >= since),
    (select count(*)::int from public.votes v join public.polls p on p.id = v.poll_id
     where v.voter_id = auth.uid() and p.decision_side = v.side and p.decided_at >= since),
    (select count(*)::int from public.result_views rv where rv.user_id = auth.uid() and rv.predicted_correctly is not null),
    (select count(*)::int from public.result_views rv where rv.user_id = auth.uid() and rv.predicted_correctly),
    (select count(*)::int from public.votes v where v.voter_id = auth.uid());
end $$;
revoke execute on function public.my_impact(int) from public, anon;
grant execute on function public.my_impact(int) to authenticated;

-- Monthly recap notification (1st of the month) for people whose reasons helped someone.
create or replace function public.queue_impact_recaps()
returns void language plpgsql security definer set search_path = '' as $$
declare u record;
begin
  for u in
    select v.voter_id as id, count(*) as votes from public.votes v
    join public.profiles p on p.id = v.voter_id and p.status = 'active'
    where v.created_at >= date_trunc('month', now()) - interval '1 month' and v.created_at < date_trunc('month', now())
    group by v.voter_id having count(*) >= 3
  loop
    perform public.notify(u.id, 'impact_recap', null, jsonb_build_object('votes', u.votes));
  end loop;
end $$;
revoke execute on function public.queue_impact_recaps() from public, anon, authenticated;
select cron.schedule('impact-recaps', '0 16 1 * *', 'select public.queue_impact_recaps()');

-- The recap counts as a nudge (budgeted).
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'decision_made' then n.poll_ended
      when 'summary_ready' then n.summary_ready when 'decision_reminder' then n.summary_ready
      when 'decision_checkin' then n.summary_ready
      when 'insight_featured' then n.insight_featured when 'impact_recap' then n.insight_featured
      when 'new_polls_digest' then n.new_polls when 'follow_up' then n.new_polls when 'last_call' then n.new_polls
      when 'boosted_poll' then n.new_polls when 'reengage' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true)
    and (p_type not in ('new_polls_digest', 'follow_up', 'last_call', 'boosted_poll', 'reengage',
                        'decision_reminder', 'decision_checkin', 'impact_recap')
         or (select count(*) from public.notifications x
             where x.user_id = p_user and x.created_at > now() - interval '7 days'
               and x.type in ('new_polls_digest', 'follow_up', 'last_call', 'boosted_poll', 'reengage',
                              'decision_reminder', 'decision_checkin', 'impact_recap')) < 4);
$$;
revoke execute on function public.notify from public, anon, authenticated;

-- 6. Privacy dashboard: what Opinion holds about you, in counts ---------------------------------------
create or replace function public.my_data_summary()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public.require_user(false);
  return jsonb_build_object(
    'joined', me.created_at,
    'birth_year_stored', me.birth_year is not null,
    'locale', me.locale,
    'last_active', me.last_active_at,
    'topics', (select count(*) from public.user_categories where user_id = me.id),
    'communities', (select count(*) from public.user_communities where user_id = me.id),
    'polls', (select count(*) from public.polls where creator_id = me.id and status <> 'deleted'),
    'votes', (select count(*) from public.votes where voter_id = me.id),
    'reasons', (select count(*) from public.votes v join public.reasons r on r.vote_id = v.id where v.voter_id = me.id),
    'notifications', (select count(*) from public.notifications where user_id = me.id),
    'devices', (select count(*) from public.device_keys where user_id = me.id),
    'campus_verified', exists (select 1 from public.campus_verifications where user_id = me.id and expires_at > now()),
    'expert_verified', exists (select 1 from public.expert_verifications where user_id = me.id and expires_at > now()),
    'circle_members', (select count(*) from public.circle_members where owner_id = me.id),
    'sponsored_opt_in', me.sponsored_opt_in,
    'plus', public.has_plus(me.id));
end $$;
revoke execute on function public.my_data_summary() from public, anon;
grant execute on function public.my_data_summary() to authenticated;

-- 7. Room mode: a quick, anonymous group decision for people in the same place -----------------------
-- The host shows a QR code; everyone joins in the app and votes; the host reveals when ready.
-- Results only from 3 votes, so nobody's vote can be singled out. Rooms expire after at most 2 hours.
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  host_id    uuid not null references public.profiles on delete cascade,
  question   text not null check (char_length(question) between 5 and 120),
  labels     text[] not null check (array_length(labels, 1) between 2 and 4),
  revealed   boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.room_votes (
  room_id    uuid not null references public.rooms on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  side       smallint check (side between 1 and 4),
  primary key (room_id, user_id)
);
alter table public.rooms enable row level security;
alter table public.room_votes enable row level security;
revoke all on public.rooms, public.room_votes from anon, authenticated;

-- Called by the rooms Edge Function after moderating the text.
create or replace function public.create_room_internal(p_user uuid, p_question text, p_labels text[], p_minutes int)
returns text language plpgsql security definer set search_path = '' as $$
declare v text := upper(substr(public.new_code(), 1, 6));
begin
  perform public.hit_rate_limit(p_user, 'room', 10, interval '1 day');
  insert into public.rooms (code, host_id, question, labels, expires_at)
  values (v, p_user, p_question, p_labels, now() + make_interval(mins => least(greatest(p_minutes, 5), 120)));
  insert into public.room_votes (room_id, user_id) select id, p_user from public.rooms where code = v;
  return v;
end $$;
revoke execute on function public.create_room_internal(uuid, text, text[], int) from public, anon, authenticated;

create or replace function public.join_room(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles; rm public.rooms;
begin
  me := public.require_user();
  select * into rm from public.rooms where code = upper(p_code) and expires_at > now();
  if rm.id is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if (select count(*) from public.room_votes where room_id = rm.id) >= 200 then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;
  insert into public.room_votes (room_id, user_id) values (rm.id, me.id) on conflict do nothing;
end $$;

create or replace function public.vote_room(p_code text, p_side smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare rm public.rooms;
begin
  perform public.require_user();
  select * into rm from public.rooms where code = upper(p_code) and expires_at > now() and not revealed;
  if rm.id is null then raise exception 'POLL_CLOSED' using errcode = 'P0001'; end if;
  if p_side < 1 or p_side > array_length(rm.labels, 1) then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  update public.room_votes set side = p_side where room_id = rm.id and user_id = auth.uid() and side is null;
  if not found then raise exception 'ALREADY_VOTED' using errcode = 'P0001'; end if;
end $$;

create or replace function public.reveal_room(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_user();
  update public.rooms set revealed = true where code = upper(p_code) and host_id = auth.uid();
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
end $$;

create or replace function public.room_state(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare rm public.rooms; n_votes int; n_people int;
begin
  perform public.require_user();
  select * into rm from public.rooms where code = upper(p_code);
  if rm.id is null or not exists (select 1 from public.room_votes where room_id = rm.id and user_id = auth.uid()) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select count(*) filter (where side is not null), count(*) into n_votes, n_people from public.room_votes where room_id = rm.id;
  return jsonb_build_object(
    'code', rm.code, 'question', rm.question, 'labels', to_jsonb(rm.labels),
    'is_host', rm.host_id = auth.uid(), 'people', n_people, 'votes', n_votes,
    'my_side', (select side from public.room_votes where room_id = rm.id and user_id = auth.uid()),
    'revealed', rm.revealed, 'expired', rm.expires_at <= now(),
    'counts', case when rm.revealed and n_votes >= 3 then
      (select jsonb_agg(coalesce((select count(*) from public.room_votes rv where rv.room_id = rm.id and rv.side = i), 0) order by i)
       from generate_series(1, array_length(rm.labels, 1)) i) end);
end $$;

revoke execute on function public.join_room(text), public.vote_room(text, smallint), public.reveal_room(text),
  public.room_state(text) from public, anon;
grant execute on function public.join_room(text), public.vote_room(text, smallint), public.reveal_room(text),
  public.room_state(text) to authenticated;

create or replace function public.prune_rooms() returns void language sql security definer set search_path = '' as $$
  delete from public.rooms where expires_at < now() - interval '1 day';
$$;
revoke execute on function public.prune_rooms() from public, anon, authenticated;
select cron.schedule('prune-rooms', '20 4 * * *', 'select public.prune_rooms()');

-- 8a. Sponsored questions: at most one a week per person ----------------------------------------------
create or replace function public.get_feed_for(
  p_user uuid, p_limit int default 20, p_after_closes timestamptz default null, p_after_id uuid default null,
  p_only uuid default null, p_after_bucket int default null)
returns table (id uuid, type public.poll_type, is_taste boolean, question text, closes_at timestamptz,
               target_label text, is_sensitive boolean, options jsonb, bucket int, follow_up_of text)
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles; sponsored_ok boolean;
begin
  select * into me from public.profiles pr where pr.id = p_user;
  sponsored_ok := me.sponsored_opt_in and not exists (
    select 1 from public.votes v join public.polls sp on sp.id = v.poll_id
    where v.voter_id = me.id and sp.sponsor_name is not null and v.created_at > now() - interval '7 days');
  return query
  select p.id, p.type, p.is_taste, p.question, p.closes_at,
    case when p.sponsor_name is not null then 'Sponsored · ' || p.sponsor_name
      when p.daily_on is not null then 'Today’s question'
      when p.friends_only then 'Friends'
      when p.type = 'community' then (select c.name from public.communities c where c.id = p.community_id)
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
    and (p_only is not null or p.daily_on is null)
    and (p.sponsor_name is null or sponsored_ok)
    and not exists (select 1 from public.votes v where v.poll_id = p.id and v.voter_id = me.id)
    and not exists (select 1 from public.info_requests i where i.poll_id = p.id and i.user_id = me.id)
    and not exists (select 1 from public.hidden_creators h where h.user_id = me.id and h.creator_id = p.creator_id)
    and (
      p.daily_on is not null
      or exists (select 1 from public.poll_invitees i where i.poll_id = p.id and i.user_id = me.id)
      or (not p.friends_only and case p.type
        when 'expert' then
          exists (select 1 from public.poll_target_categories t join public.user_categories uc
                  on uc.category_id = t.category_id where t.poll_id = p.id and uc.user_id = me.id)
          and (p.age_min is null or extract(year from now())::int - me.birth_year between p.age_min and p.age_max)
        else exists (select 1 from public.user_communities m where m.user_id = me.id and m.community_id = p.community_id)
      end))
    and (p_after_closes is null
         or ((p.vote_count >= 10)::int, p.closes_at, p.id) > (coalesce(p_after_bucket, 0), p_after_closes, p_after_id))
    and (p_only is null or p.id = p_only)
  order by (p.vote_count >= 10)::int, p.closes_at, p.id
  limit least(p_limit, 50);
end $$;
revoke execute on function public.get_feed_for(uuid, int, timestamptz, uuid, uuid, int) from public, anon, authenticated;

-- 8b. Public transparency report (aggregates only, last 90 days) -------------------------------------
create or replace function public.public_transparency_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'period_days', 90,
    'polls_published', (select count(*) from public.polls where published_at > now() - interval '90 days'),
    'reports', (select count(*) from public.reports where created_at > now() - interval '90 days'),
    'actions', (select coalesce(jsonb_object_agg(action, n), '{}') from (
      select action, count(*) n from public.moderation_actions where created_at > now() - interval '90 days'
      and action in ('remove', 'warn', 'suspend', 'dismiss', 'restore') group by action) a),
    'appeals', (select count(*) from public.appeals where created_at > now() - interval '90 days'),
    'appeals_reversed', (select count(*) from public.appeals where created_at > now() - interval '90 days' and status = 'reversed'),
    'median_hours_to_action', (select round((percentile_cont(0.5) within group (order by extract(epoch from m.created_at - r.created_at) / 3600))::numeric, 1)
      from public.moderation_actions m join public.reports r on r.id = m.report_id where m.created_at > now() - interval '90 days'),
    'summaries_flagged', (select count(distinct poll_id) from public.summary_flags where created_at > now() - interval '90 days'),
    'generated_at', now());
$$;
revoke execute on function public.public_transparency_stats() from public;
grant execute on function public.public_transparency_stats() to anon, authenticated;
