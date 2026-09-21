-- Migration 0009: Real user-submitted game ratings
-- ============================================================================
-- Adds the ability for users to rate games (1-5 stars), with automatic
-- recomputation of games.rating as the average of real user ratings.
--
-- DESIGN NOTES:
--  • games.rating stays as the admin-set default/seed value until the first
--    real rating exists — the trigger only overwrites it once rating_count > 0
--    so it never gets stomped to 0 for a game nobody has rated yet.
--  • One rating per (user_id, game_id); resubmitting updates it (upsert).
-- ============================================================================

create table if not exists public.game_ratings (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  game_id    text        not null references public.games (id) on delete cascade,
  score      smallint    not null check (score >= 1 and score <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists game_ratings_game_id_idx on public.game_ratings (game_id);

drop trigger if exists game_ratings_set_updated_at on public.game_ratings;
create trigger game_ratings_set_updated_at
  before update on public.game_ratings
  for each row execute function public.set_updated_at();

-- games.rating_count — how many real ratings a game has received.
alter table public.games
  add column if not exists rating_count integer not null default 0 check (rating_count >= 0);

-- ── Recompute games.rating / rating_count on any change ─────────────────────
create or replace function public.recompute_game_rating()
returns trigger
language plpgsql as $$
declare
  affected_game_id text := coalesce(new.game_id, old.game_id);
  avg_score numeric;
  cnt int;
begin
  select avg(score)::numeric(2,1), count(*)
    into avg_score, cnt
    from public.game_ratings
    where game_id = affected_game_id;

  if cnt = 0 then
    -- No real ratings left: leave games.rating as-is (admin/default value),
    -- just zero out the count.
    update public.games set rating_count = 0 where id = affected_game_id;
  else
    update public.games
    set rating = avg_score,
        rating_count = cnt
    where id = affected_game_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_game_ratings_recompute on public.game_ratings;
create trigger trg_game_ratings_recompute
after insert or update or delete on public.game_ratings
for each row
execute function public.recompute_game_rating();

alter table public.game_ratings enable row level security;
