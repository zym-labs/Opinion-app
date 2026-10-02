-- Decision outcomes and last-call nudges: new notification types (own migration for enum values).
alter type public.notif_type add value if not exists 'decision_made';
alter type public.notif_type add value if not exists 'decision_reminder';
alter type public.notif_type add value if not exists 'last_call';
