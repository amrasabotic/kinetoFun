-- Migration 0006: XP progression system + play_count tracking

-- ── XP Progression ────────────────────────────────────────────────────────────
-- Atomic RPC to increment user XP and recalculate level.
-- Formula: level = floor((xp + delta) / 1000) + 1

create or replace function public.increment_user_xp(user_id uuid, xp_delta int)
returns table(xp int, level int)
language plpgsql as $$
declare
  new_xp int;
  new_level int;
begin
  update public.users
  set xp = xp + xp_delta,
      level = floor((xp + xp_delta) / 1000) + 1,
      updated_at = now()
  where id = user_id
  returning xp, level into new_xp, new_level;
  return query select new_xp, new_level;
end;
$$;

-- ── Play Count Tracking ──────────────────────────────────────────────────────
-- Trigger to increment game.play_count whenever a session starts.

create or replace function public.increment_play_count()
returns trigger
language plpgsql as $$
begin
  update public.games
  set play_count = play_count + 1
  where id = new.game_id;
  return new;
end;
$$;

drop trigger if exists trg_session_play_count on public.game_sessions;

create trigger trg_session_play_count
after insert on public.game_sessions
for each row
execute function public.increment_play_count();
