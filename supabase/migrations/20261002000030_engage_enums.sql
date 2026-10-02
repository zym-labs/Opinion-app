-- Enum values for boosts (must be committed before use).
alter type public.credit_reason add value if not exists 'boost';
alter type public.notif_type add value if not exists 'boosted_poll';
