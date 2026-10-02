-- STAGING ONLY. Removes load-test polls and users.
delete from public.polls where question like 'Load test poll #%';
delete from auth.users where email like 'loadtest+%@example.com';
