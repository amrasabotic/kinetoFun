-- KinetoFun — seed for tic-tac-toe, air-hockey, connect-4, gesture-word
-- Run in the Supabase SQL editor after schema.sql.
-- Idempotent: re-running updates existing rows.

insert into public.games
  (id, title, tagline, description, category, players, min_players, max_players, cover, cover_image, accent, rating, release_year, duration_minutes, featured)
values

  ('tic-tac-toe',
   'Gesture Tic Tac Toe',
   'X vs O — no hands, just gestures.',
   'Classic Tic Tac Toe reimagined with hand tracking. Point your finger to place your mark. Supports 1-player (vs AI) and 2-player local modes.',
   'Puzzle', 'both', 1, 2,
   'from-rose-500 via-fuchsia-600 to-violet-700', null, '#c026d3',
   4.3, 2025, 5, false),

  ('air-hockey',
   'Hand Air Hockey',
   'Flick, block, and score with bare hands.',
   'A fast-paced air hockey game controlled entirely by hand gestures. Move your paddle with your open hand, score goals, and challenge a friend or the AI.',
   'Sports', 'both', 1, 2,
   'from-cyan-400 via-blue-500 to-violet-600', null, '#06b6d4',
   4.5, 2025, 10, true),

  ('connect-4',
   'Connect 4 — Gesture Edition',
   'Drop, block, and connect four to win.',
   'The timeless Connect 4 strategy game, played with hand gestures. Point to choose a column, then drop your disc. First to four in a row wins.',
   'Puzzle', 'both', 1, 2,
   'from-red-500 via-amber-500 to-blue-700', null, '#ef4444',
   4.4, 2025, 8, false),

  ('gesture-word',
   'GestureWords',
   'Spell it out — letter by letter in the air.',
   'A gesture-powered word game where you hover over letters to build words. Race against the clock, climb difficulty tiers, and beat your high score.',
   'Puzzle', 'single', 1, 1,
   'from-violet-500 via-indigo-600 to-teal-600', null, '#7c6af7',
   4.6, 2025, 12, true)

on conflict (id) do update set
  title            = excluded.title,
  tagline          = excluded.tagline,
  description      = excluded.description,
  category         = excluded.category,
  players          = excluded.players,
  min_players      = excluded.min_players,
  max_players      = excluded.max_players,
  cover            = excluded.cover,
  cover_image      = excluded.cover_image,
  accent           = excluded.accent,
  rating           = excluded.rating,
  release_year     = excluded.release_year,
  duration_minutes = excluded.duration_minutes,
  featured         = excluded.featured;
