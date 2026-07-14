-- Migration 0011: User favorites (wishlist)
-- ============================================================================
-- Lets a user star/save a game for later. One row per (user_id, game_id);
-- toggling off simply deletes the row.
-- ============================================================================

create table if not exists public.favorites (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  game_id    text        not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;
