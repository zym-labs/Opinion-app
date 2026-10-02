-- Phase 1 notification types (enum values must be committed before use).
alter type public.notif_type add value if not exists 'reengage';
alter type public.notif_type add value if not exists 'decision_checkin';
alter type public.notif_type add value if not exists 'info_requested';
