-- Sign in with Apple refresh tokens, kept only to revoke them on account deletion (Apple requirement,
-- STAGE2 §7). Encrypted by the Edge Function (AES-GCM) before storage; never readable by clients.
create table public.apple_tokens (
  user_id         uuid primary key references public.profiles on delete cascade,
  refresh_token_enc text not null,
  created_at      timestamptz not null default now()
);
alter table public.apple_tokens enable row level security;
revoke all on public.apple_tokens from anon, authenticated;
