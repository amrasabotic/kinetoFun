-- Migration 0015: Tickets, play streaks and badges
-- ============================================================================
-- Tickets are the single platform reward currency. They are earned for
-- finishing games, setting personal bests, keeping a daily play streak and
-- earning badges. Tickets can never be bought with real money.
--
-- users.tickets is a cached balance. Every change to it is written in the same
-- transaction as a reward_ledger row, so the ledger is the audit trail and the
-- balance can always be rebuilt from it.
--
-- Idempotent — safe to re-run.
--   node scripts/run-migration.mjs supabase/migrations/0015_rewards.sql
-- ============================================================================

alter table public.users
  add column if not exists tickets integer not null default 0 check (tickets >= 0);

-- ── reward_ledger  (append-only history of every ticket earned or spent) ─────
create table if not exists public.reward_ledger (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  delta      integer     not null,
  -- 'game_complete' | 'personal_best' | 'new_game' | 'daily_streak' | 'badge' | 'admin_adjust'
  reason     text        not null,
  game_id    text        references public.games (id) on delete set null,
  session_id uuid        references public.game_sessions (id) on delete set null,
  -- Stable key for one-off awards (a badge id, a calendar day) so they can
  -- never be paid twice.
  ref        text,
  created_at timestamptz not null default now()
);

create index if not exists reward_ledger_user_idx
  on public.reward_ledger (user_id, created_at desc);

-- One payout of each kind per play session: replaying a GAME_COMPLETE message
-- or retrying the request cannot earn twice.
create unique index if not exists reward_ledger_session_reason_key
  on public.reward_ledger (session_id, reason) where session_id is not null;

create unique index if not exists reward_ledger_user_reason_ref_key
  on public.reward_ledger (user_id, reason, ref) where ref is not null;

-- ── user_streaks  (consecutive calendar days, UTC, with a finished game) ─────
create table if not exists public.user_streaks (
  user_id        uuid    primary key references public.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak    integer not null default 0 check (best_streak >= 0),
  last_play_date date
);

-- ── user_badges  (platform badges; the catalogue lives in src/lib/rewards) ───
create table if not exists public.user_badges (
  user_id   uuid        not null references public.users (id) on delete cascade,
  badge_id  text        not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
