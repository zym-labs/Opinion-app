-- Phase 4 notification type (enum values must be committed before use).
alter type public.notif_type add value if not exists 'impact_recap';
