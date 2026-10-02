-- Phase 7 security review (STAGE4 §9).

-- 1. Logged-out clients may not call any function; signed-in clients keep their explicit grants,
--    and internal functions stay revoked from them (earlier migrations).
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke execute on functions from anon, public;

-- 2. Audience estimates never reveal exact small counts (membership probing) and are rate limited.
create or replace function public.estimate_audience(
  p_type public.poll_type, p_categories smallint[] default '{}', p_age_min smallint default null,
  p_age_max smallint default null, p_community uuid default null)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  perform public.require_user();
  perform public.hit_rate_limit(auth.uid(), 'audience', 30, interval '1 minute');
  select count(*) into n from public.audience_ids(auth.uid(), p_type, p_categories, p_age_min, p_age_max, p_community);
  return case when n < 20 then 0 else (n / 10) * 10 end;
end $$;

-- 3. Reports must point at something that exists (and that the reporter could have seen).
create or replace function public.submit_report(
  p_target public.report_target, p_target_id uuid, p_reason public.report_reason, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  found_target boolean;
begin
  perform public.require_user();
  perform public.hit_rate_limit(auth.uid(), 'report', 20, interval '1 day');
  if p_target = 'poll' then
    found_target := exists (select 1 from public.polls where id = p_target_id and status not in ('draft','deleted'));
  elsif p_target = 'reason' then
    found_target := exists (select 1 from public.reasons where vote_id = p_target_id);
  else
    found_target := exists (select 1 from public.featured_insights where id = p_target_id and not removed);
  end if;
  if not found_target then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_type, poll_id, reason_vote_id, featured_insight_id, reason, note, severity)
  values (auth.uid(), p_target,
          case p_target when 'poll' then p_target_id end,
          case p_target when 'reason' then p_target_id end,
          case p_target when 'featured_insight' then p_target_id end,
          p_reason, nullif(trim(p_note), ''),
          case when p_reason in ('self_harm','hate','sexual') then 3
               when p_reason in ('harassment','personal_info') then 2 else 1 end)
  on conflict do nothing;
end $$;
grant execute on function public.submit_report(public.report_target, uuid, public.report_reason, text) to authenticated;
grant execute on function public.estimate_audience(public.poll_type, smallint[], smallint, smallint, uuid) to authenticated;

-- 4. Poll images: JPEG only, 5 MB max, and only the two expected file names.
update storage.buckets set file_size_limit = 5 * 1024 * 1024, allowed_mime_types = array['image/jpeg']
where id = 'poll-images';

drop policy "creator uploads draft images" on storage.objects;
create policy "creator uploads draft images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'poll-images'
  and split_part(name, '/', 2) in ('a.jpg', 'b.jpg')
  and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.creator_id = auth.uid() and p.status = 'draft')
);
-- upsert: true needs update on the same objects.
create policy "creator replaces draft images" on storage.objects for update to authenticated
using (
  bucket_id = 'poll-images' and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.creator_id = auth.uid() and p.status = 'draft')
);
