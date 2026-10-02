-- Review fixes (2026-10-02).

-- 1. Follow-up notifications respect the "new polls" preference.
create or replace function public.notify(p_user uuid, p_type public.notif_type, p_poll uuid, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, poll_id, payload)
  select p_user, p_type, p_poll, p_payload
  where coalesce((select case p_type
      when 'poll_ended' then n.poll_ended when 'summary_ready' then n.summary_ready
      when 'insight_featured' then n.insight_featured
      when 'new_polls_digest' then n.new_polls when 'follow_up' then n.new_polls
      else true end
    from public.notification_prefs n where n.user_id = p_user), true);
$$;
revoke execute on function public.notify from public, anon, authenticated;

-- 2. Retention for tables added after STAGE3 §10: integrity logs 90 days, challenges and codes on expiry.
create or replace function public.run_retention_extra()
returns void language sql security definer set search_path = '' as $$
  delete from public.integrity_events where created_at < now() - interval '90 days';
  delete from public.integrity_challenges where expires_at < now();
  delete from public.expert_codes where expires_at < now();
$$;
revoke execute on function public.run_retention_extra() from public, anon, authenticated;
select cron.schedule('retention-extra', '15 4 * * *', 'select public.run_retention_extra()');

-- 3. Image updates keep the same naming rule as uploads (no renaming to arbitrary paths).
drop policy "creator replaces draft images" on storage.objects;
create policy "creator replaces draft images" on storage.objects for update to authenticated
using (
  bucket_id = 'poll-images' and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.creator_id = auth.uid() and p.status = 'draft')
)
with check (
  bucket_id = 'poll-images'
  and split_part(name, '/', 2) in ('a.jpg', 'b.jpg', 'c.jpg', 'd.jpg')
  and exists (
    select 1 from public.polls p
    where p.id::text = split_part(name, '/', 1) and p.creator_id = auth.uid() and p.status = 'draft')
);
