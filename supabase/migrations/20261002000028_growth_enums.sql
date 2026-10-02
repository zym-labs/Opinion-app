-- New credit reason for referrals (enum values must be committed before use).
alter type public.credit_reason add value if not exists 'referral';
alter type public.notif_type add value if not exists 'referral_credited';
