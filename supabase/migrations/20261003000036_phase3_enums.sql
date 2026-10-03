-- Phase 3 credit reason (enum values must be committed before use).
alter type public.credit_reason add value if not exists 'sponsored';
