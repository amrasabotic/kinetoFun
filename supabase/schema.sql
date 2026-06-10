-- ============================================================================
-- KinetoFun — COMPLETE database schema (Supabase PostgreSQL)
-- ----------------------------------------------------------------------------
-- Supabase is used as the DATABASE ONLY (no Supabase Auth). The app reads/writes
-- these tables from the server with the SERVICE ROLE key, which bypasses RLS.
--
-- HOW TO RUN:  Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- It is idempotent (safe to re-run) and is the full schema for the app — it
-- includes everything in migrations/0001_auth.sql, so for a fresh project run
-- THIS file (you do not also need 0001).
--
-- Column names are snake_case to match the repository layer; they map directly
-- onto src/types (Game, User, Score, Session) and src/types/auth.ts.
-- ============================================================================

create extension if not exists pgcrypto;   -- provides gen_random_uuid()

-- ── Enums (mirror the string unions in src/types) ────────────────────────────
do $$ begin
  create type game_players as enum ('single', 'multi', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_category as enum
    ('Action', 'Puzzle', 'Sports', 'Arcade', 'Adventure', 'Party');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('active', 'ended');
exception when duplicate_object then null; end $$;

-- ── updated_at helper trigger ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── users  (auth identity + player profile) ──────────────────────────────────
-- The auth code requires: id, email, password_hash, name, created_at.
-- The rest are profile fields the UI already understands (defaults supplied so
-- the current register flow keeps working without changes).
create table if not exists public.users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null,
  password_hash text        not null,
  name          text        not null,             -- display name (set at signup)
  username      text,                             -- optional @handle
  avatar_color  text        not null default 'from-fuchsia-500 to-purple-600',
  level         integer     not null default 1 check (level >= 1),
  xp            integer     not null default 0 check (xp >= 0),
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Case-insensitive uniqueness (the app stores email lowercased).
create unique index if not exists users_email_lower_key
  on public.users (lower(email));
create unique index if not exists users_username_lower_key
  on public.users (lower(username)) where username is not null;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── games  (catalog) ─────────────────────────────────────────────────────────
create table if not exists public.games (
  id               text          primary key,        -- slug, e.g. 'neon-pong'
  title            text          not null,
  tagline          text          not null default '',
  description      text          not null default '',
  category         game_category not null,
  players          game_players  not null,
  min_players      integer       not null default 1 check (min_players >= 1),
  max_players      integer       not null default 1 check (max_players >= min_players),
  cover            text          not null default '',  -- Tailwind gradient classes
  accent           text          not null default '',
  rating           numeric(2,1)  not null default 0 check (rating >= 0 and rating <= 5),
  release_year     integer,
  duration_minutes integer,
  featured         boolean       not null default false,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

create index if not exists games_category_idx on public.games (category);
create index if not exists games_featured_idx on public.games (featured) where featured;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

-- ── scores ───────────────────────────────────────────────────────────────────
create table if not exists public.scores (
  id          uuid        primary key default gen_random_uuid(),
  game_id     text        not null references public.games (id) on delete cascade,
  user_id     uuid        not null references public.users (id) on delete cascade,
  score       bigint      not null check (score >= 0),
  achieved_at timestamptz not null default now()
);

create index if not exists scores_game_score_idx on public.scores (game_id, score desc);
create index if not exists scores_user_idx        on public.scores (user_id, achieved_at desc);

-- ── game_sessions  (play sessions; multiplayer via session_players) ──────────
create table if not exists public.game_sessions (
  id         uuid           primary key default gen_random_uuid(),
  game_id    text           not null references public.games (id) on delete cascade,
  user_id    uuid           not null references public.users (id) on delete cascade, -- host/owner
  status     session_status not null default 'active',
  started_at timestamptz    not null default now(),
  ended_at   timestamptz,
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists game_sessions_user_idx   on public.game_sessions (user_id);
create index if not exists game_sessions_game_idx   on public.game_sessions (game_id);
create index if not exists game_sessions_status_idx on public.game_sessions (status);

-- The Session.players[] array, normalized for real multiplayer identity tracking.
create table if not exists public.session_players (
  session_id uuid        not null references public.game_sessions (id) on delete cascade,
  user_id    uuid        not null references public.users (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists session_players_user_idx on public.session_players (user_id);

-- ── auth_sessions  (OPTIONAL — JWT/refresh-token tracking) ───────────────────
-- Not needed by the stateless JWT flow. Here for future refresh-token rotation,
-- revocation, "log out everywhere", and device lists.
create table if not exists public.auth_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  token      text,                                  -- store a HASH, never raw
  user_agent text,
  ip         text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists auth_sessions_user_idx on public.auth_sessions (user_id);

-- ── subscriptions  (OPTIONAL / FUTURE — paywall) ─────────────────────────────
-- Not used yet; included so the paywall lands without structural change.
create table if not exists public.subscriptions (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references public.users (id) on delete cascade,
  plan                     text        not null default 'free',
  status                   text        not null default 'inactive',
  provider                 text,                    -- e.g. 'stripe'
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── Leaderboard view  (best score per user per game, ranked) ─────────────────
-- Convenience for the leaderboard feature. `security_invoker` makes it respect
-- the querier's RLS (so it isn't an accidental data leak via the anon key).
create or replace view public.game_leaderboards
with (security_invoker = on) as
select
  game_id,
  user_id,
  best_score,
  rank() over (partition by game_id order by best_score desc) as rank
from (
  select game_id, user_id, max(score) as best_score
  from public.scores
  group by game_id, user_id
) ranked;

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The server uses the SERVICE ROLE key, which bypasses RLS. Enabling RLS with no
-- policies makes every table unreachable with the public anon key (locked down).
-- If you later read public data (e.g. games) from the browser with the anon key,
-- add SELECT policies for just those tables.
alter table public.users           enable row level security;
alter table public.games           enable row level security;
alter table public.scores          enable row level security;
alter table public.game_sessions   enable row level security;
alter table public.session_players enable row level security;
alter table public.auth_sessions   enable row level security;
alter table public.subscriptions   enable row level security;
