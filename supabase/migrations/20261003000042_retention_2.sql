-- Retention for records added after the first retention jobs, matching the privacy policy:
--   moderation records, reports and appeals: 2 years (appeals go with their decision);
--   integrity and AI-quality flags: 1 year; per-poll interaction rows: 90 days after the poll closes;
--   crisis counters: 2 years (aggregate, no identity).
create or replace function public.run_retention_2()
returns void language sql security definer set search_path = '' as $$
  delete from public.moderation_actions where created_at < now() - interval '2 years';   -- cascades to appeals
  delete from public.reports where created_at < now() - interval '2 years';
  delete from public.appeals where created_at < now() - interval '2 years';
  delete from public.integrity_flags where created_at < now() - interval '1 year';
  delete from public.summary_flags where created_at < now() - interval '1 year';
  delete from public.info_requests i using public.polls p
    where i.poll_id = p.id and p.closes_at < now() - interval '90 days';
  delete from public.poll_invitees i using public.polls p
    where i.poll_id = p.id and p.closes_at < now() - interval '90 days';
  delete from public.crisis_counts where day < current_date - 730;
$$;
revoke execute on function public.run_retention_2() from public, anon, authenticated;
select cron.schedule('retention-2', '40 4 * * *', 'select public.run_retention_2()');
