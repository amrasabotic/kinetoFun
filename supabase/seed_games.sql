-- KinetoFun — games catalog seed (10 games).
-- Run AFTER supabase/schema.sql, in the Supabase SQL editor.
-- Idempotent: re-running updates existing rows (upsert on id).
--
-- `cover` values are Tailwind gradient class strings (the app renders them as
-- `bg-gradient-to-br <cover>`); `accent` is a hex used for detail/launch UI.

insert into public.games
  (id, title, tagline, description, category, players, min_players, max_players, cover, accent, rating, release_year, duration_minutes, featured)
values
  ('neon-drift', 'Neon Drift', 'Outrun the grid at light speed.',
   'A high-velocity arcade racer set on glowing neon circuits. Drift through hairpin turns, chain boosts, and battle up to three friends in split-screen chaos.',
   'Action', 'both', 1, 4, 'from-fuchsia-600 via-purple-600 to-indigo-700', '#c026d3', 4.7, 2025, 12, true),

  ('block-cascade', 'Block Cascade', 'Stack, clear, survive.',
   'A meditative falling-block puzzler with escalating tempo. Clear cascading lines, trigger combos, and chase your personal best.',
   'Puzzle', 'single', 1, 1, 'from-cyan-500 via-sky-600 to-blue-700', '#0ea5e9', 4.4, 2024, 8, true),

  ('galaxy-strikers', 'Galaxy Strikers', 'Defend the colony, together.',
   'Co-op twin-stick shooter against endless alien waves. Coordinate fire, share power-ups, and climb the survival leaderboard.',
   'Arcade', 'multi', 2, 4, 'from-emerald-500 via-teal-600 to-cyan-700', '#10b981', 4.6, 2025, 15, true),

  ('court-kings', 'Court Kings', 'Rule the hardwood.',
   'Fast, stylish 3-on-3 street basketball. Pull off trick shots, alley-oops, and buzzer beaters solo or with a crew.',
   'Sports', 'both', 1, 4, 'from-orange-500 via-amber-600 to-red-600', '#f97316', 4.2, 2023, 20, false),

  ('shadow-quest', 'Shadow Quest', 'A realm shaped by your choices.',
   'A story-driven action RPG. Explore a fractured kingdom, master shadow magic, and decide the fate of its people.',
   'Adventure', 'single', 1, 1, 'from-violet-700 via-indigo-800 to-slate-900', '#7c3aed', 4.8, 2025, 45, true),

  ('party-panic', 'Party Panic', 'Mini-game mayhem for everyone.',
   'Dozens of frantic mini-games designed for the living room. Pass the controller — or wave your hands later — and let the chaos decide a winner.',
   'Party', 'multi', 2, 4, 'from-pink-500 via-rose-500 to-orange-500', '#ec4899', 4.5, 2024, 25, false),

  ('pixel-racer', 'Pixel Racer', 'Retro speed, modern thrills.',
   'A pixel-art top-down racer with hand-built tracks and tight controls. Time-trial the ghosts or race the room.',
   'Action', 'both', 1, 4, 'from-lime-500 via-green-600 to-emerald-700', '#65a30d', 4.1, 2022, 10, false),

  ('mind-maze', 'Mind Maze', 'Think your way out.',
   'Hand-crafted logic mazes and lateral-thinking puzzles that get fiendishly clever. Perfect for a calm solo session.',
   'Puzzle', 'single', 1, 1, 'from-indigo-500 via-blue-600 to-cyan-600', '#6366f1', 4.3, 2023, 18, false),

  ('aero-dunk', 'Aero Dunk', 'Zero gravity. Maximum hops.',
   'Anti-gravity team basketball where every wall is in play. Bounce, boost, and dunk across floating arenas.',
   'Sports', 'multi', 2, 4, 'from-sky-500 via-indigo-600 to-violet-700', '#3b82f6', 4.0, 2024, 16, false),

  ('rune-realms', 'Rune Realms', 'Forge a legend with friends.',
   'A cozy co-op adventure across mystic islands. Solve rune puzzles, tame creatures, and build your shared sanctuary.',
   'Adventure', 'both', 1, 4, 'from-teal-500 via-emerald-600 to-green-700', '#14b8a6', 4.6, 2025, 40, true)

on conflict (id) do update set
  title            = excluded.title,
  tagline          = excluded.tagline,
  description      = excluded.description,
  category         = excluded.category,
  players          = excluded.players,
  min_players      = excluded.min_players,
  max_players      = excluded.max_players,
  cover            = excluded.cover,
  accent           = excluded.accent,
  rating           = excluded.rating,
  release_year     = excluded.release_year,
  duration_minutes = excluded.duration_minutes,
  featured         = excluded.featured;
