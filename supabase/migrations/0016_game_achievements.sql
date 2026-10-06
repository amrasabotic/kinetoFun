-- Migration 0016: In-game achievements collected on the platform
-- ============================================================================
-- Several games keep their own achievement list in the browser. The platform
-- copies the ones a player has unlocked into this table so they show on the
-- profile as a collection and earn a few tickets each. The allowed ids per game
-- live in src/lib/rewards/game-achievements.ts; anything else is rejected.
--
-- Requires 0015_rewards.sql. Idempotent — safe to re-run.
--   node scripts/run-migration.mjs supabase/migrations/0016_game_achievements.sql
-- ============================================================================

create table if not exists public.user_game_achievements (
  user_id        uuid        not null references public.users (id) on delete cascade,
  game_id        text        not null references public.games (id) on delete cascade,
  achievement_id text        not null,
  earned_at      timestamptz not null default now(),
  primary key (user_id, game_id, achievement_id)
);
