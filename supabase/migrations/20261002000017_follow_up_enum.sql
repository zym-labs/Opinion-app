-- Follow-up polls: new notification type (enum values need their own migration).
alter type public.notif_type add value if not exists 'follow_up';
