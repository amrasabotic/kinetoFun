-- Migration 0010: Password reset tokens
-- ============================================================================
-- Supports the "forgot password" email flow. Only a SHA-256 hash of the token
-- is ever stored (mirrors how auth_sessions never stores the raw JWT) so a
-- leaked database row can't be replayed as a live reset link.
-- ============================================================================

create table if not exists public.password_reset_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  token_hash text        not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);

-- Partial index: only unused tokens are ever looked up by hash.
create index if not exists password_reset_tokens_lookup_idx
  on public.password_reset_tokens (token_hash)
  where used_at is null;
