-- KinetoFun — auth schema for Supabase PostgreSQL.
-- Supabase is used as the DATABASE ONLY (no Supabase Auth). Apply this in the
-- Supabase SQL editor, or with the Supabase CLI:  supabase db push
--
-- The app reads/writes these tables server-side with the SERVICE ROLE key,
-- which bypasses RLS. RLS is enabled so the tables are not reachable with the
-- public anon key.

create extension if not exists "pgcrypto";

-- ── users ────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,
  password_hash text        not null,
  name          text        not null,
  created_at    timestamptz not null default now()
);

-- Case-insensitive uniqueness on email (the app stores it lowercased).
create unique index if not exists users_email_lower_key
  on public.users (lower(email));

-- ── sessions (optional) ──────────────────────────────────────────────────────
-- Not required by the stateless JWT flow. Present for future use: token
-- revocation, "log out everywhere", device lists, multiplayer identity, etc.
create table if not exists public.sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  token      text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.users    enable row level security;
alter table public.sessions enable row level security;
