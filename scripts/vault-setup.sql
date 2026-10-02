-- Run once per project in the Supabase SQL editor after the first deploy.
-- Lets pg_cron call the ai-summary and push workers (see public.invoke_edge).
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service role / secret key>', 'service_role_key');

-- Check the cron jobs exist:
select jobname, schedule from cron.job order by jobname;

-- Make yourself an admin (then set up two-factor at /admin):
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@domain');
