-- Migration 0017: Ticket shop — cosmetics, mystery boxes and secret worlds
-- ============================================================================
-- Players spend tickets on avatar emojis, avatar frames and profile banners,
-- on mystery boxes containing one of those, and on unlocking secret worlds
-- (games a superadmin has given a ticket price). The cosmetic catalogue lives
-- in src/lib/rewards/shop.ts; only ownership and equipped choices are stored.
--
-- Requires 0015_rewards.sql. Idempotent — safe to re-run.
--   node scripts/run-migration.mjs supabase/migrations/0017_shop.sql
-- ============================================================================

-- Equipped cosmetics (catalogue item ids). null = the free default look.
alter table public.users
  add column if not exists equipped_avatar text,
  add column if not exists equipped_frame  text,
  add column if not exists equipped_banner text;

create table if not exists public.user_items (
  user_id     uuid        not null references public.users (id) on delete cascade,
  item_id     text        not null,
  -- 'purchase' | 'mystery_box' | 'admin'
  source      text        not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- A game with an unlock_cost is a secret world: players need to unlock it with
-- tickets before playing, unless they had already played it before it was
-- locked. null = an ordinary game, free to play.
alter table public.games
  add column if not exists unlock_cost integer check (unlock_cost is null or unlock_cost > 0);

create table if not exists public.user_unlocked_games (
  user_id     uuid        not null references public.users (id) on delete cascade,
  game_id     text        not null references public.games (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
