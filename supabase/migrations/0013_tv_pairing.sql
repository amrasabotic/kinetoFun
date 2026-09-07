-- ============================================================================
-- 0013_tv_pairing.sql — TV setup / TV pairing (Raspberry Pi console)
-- ----------------------------------------------------------------------------
-- The TV (Chromium on a Pi) and the user's phone are two separate clients. The
-- phone authenticates the USER with the existing cookie/JWT auth; the TV owns a
-- temporary PAIRING SESSION. These tables link USER <-> TV SESSION.
--
-- The QR code shown on the TV contains only `pairing_code` — never credentials,
-- never a user id, never a JWT. The TV proves it is the same TV that created the
-- session with a 256-bit secret, stored here only as a SHA-256 hash (same
-- pattern as password_reset_tokens.token_hash).
--
-- Idempotent — safe to re-run.
--   node scripts/run-migration.mjs supabase/migrations/0013_tv_pairing.sql
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── tv_devices  (a physical TV / Pi; identified by a stable device_key) ──────
-- Minimal on purpose: enough for a Pi to identify itself later (e.g. KF-TV-001)
-- without building any device admin UI now. A dev browser simulating a TV gets
-- an auto-generated key.
create table if not exists public.tv_devices (
  id           uuid        primary key default gen_random_uuid(),
  device_key   text        not null,                  -- e.g. 'KF-TV-001'
  name         text,
  status       text        not null default 'active'
                 check (status in ('active', 'retired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists tv_devices_device_key_key
  on public.tv_devices (device_key);

drop trigger if exists tv_devices_set_updated_at on public.tv_devices;
create trigger tv_devices_set_updated_at
  before update on public.tv_devices
  for each row execute function public.set_updated_at();

-- ── tv_sessions  (one temporary pairing session per TV attempt) ──────────────
-- Lifecycle:  waiting -> authenticated -> ready -> ended   (+ terminal expired)
--   waiting        TV is showing the QR, nobody has scanned yet
--   authenticated  a phone completed login and claimed this code
--   ready          the TV exchanged its secret for its own auth session
--   ended          pairing torn down; the TV creates a fresh session
--   expired        the waiting window elapsed; the code can never be used again
-- There is no stored PLAYING state — once the TV is `ready` it holds a normal
-- auth session and the existing public.game_sessions table owns play state.
create table if not exists public.tv_sessions (
  id               uuid        primary key default gen_random_uuid(),
  device_id        uuid        references public.tv_devices (id) on delete set null,
  -- Short, human-readable code shown on screen and embedded in the QR URL.
  -- 6 chars from an unambiguous 31-char alphabet (~30 bits). Short-lived and
  -- single-use, with rate limiting on the join endpoint, so the low entropy is
  -- acceptable; it is never a long-lived credential.
  pairing_code     text        not null,
  -- SHA-256 hex of the TV's secret. The raw secret is returned exactly once, at
  -- creation, and only ever held by the TV client.
  secret_hash      text        not null,
  status           text        not null default 'waiting'
                     check (status in ('waiting', 'authenticated', 'ready', 'ended', 'expired')),
  user_id          uuid        references public.users (id) on delete cascade,
  -- The auth_sessions row minted FOR THE TV, so ending the pairing revokes the
  -- TV's session only and never the phone's.
  auth_session_id  uuid        references public.auth_sessions (id) on delete set null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,              -- applies to the waiting phase
  authenticated_at timestamptz,
  last_seen_at     timestamptz
);

create unique index if not exists tv_sessions_pairing_code_key
  on public.tv_sessions (pairing_code);
create index if not exists tv_sessions_status_expires_idx
  on public.tv_sessions (status, expires_at);
create index if not exists tv_sessions_user_idx
  on public.tv_sessions (user_id);
create index if not exists tv_sessions_device_idx
  on public.tv_sessions (device_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enabled with no policies, like every other table: unreachable with the anon
-- key; the server connects with a privileged role.
alter table public.tv_devices  enable row level security;
alter table public.tv_sessions enable row level security;
