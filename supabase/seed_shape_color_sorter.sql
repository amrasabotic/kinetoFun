-- ============================================================================
-- KinetoFun — Shape & Color Sorter seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'shape-color-sorter',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/shape-color-sorter/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
-- ============================================================================

insert into public.games (
  id,
  title,
  tagline,
  description,
  short_description,
  category,
  category_id,
  players,
  min_players,
  max_players,
  cover,
  accent,
  rating,
  release_year,
  duration_minutes,
  difficulty,
  age_group,
  status,
  featured
)
values (
  'shape-color-sorter',
  'Shape & Color Sorter',
  'Point at the right basket to sort every shape and color — perfect for the youngest players.',
  'Shape & Color Sorter is a gentle, gesture-only sorting game built for the youngest KinetoFun players. '
  'A friendly shape bobs in the center of the screen — hover a fingertip over the matching basket for about '
  'half a second to sort it in, with a cheerful chime, a burst of sparkles, and (optionally) the shape or '
  'color name spoken aloud. There is no timer, no fail state, and no harsh punishment: choosing the wrong '
  'basket just gives it a gentle wobble and a soft "try again" tone, then waits patiently for another try. '
  'Three simple modes build different skills — Sort by Shape (circle, square, triangle, star, heart, diamond), '
  'Sort by Color (red, blue, green, yellow, orange, purple), and Mixed Mode, which asks for both together. '
  'Basket count grows gently from two to four across each 12-round session, and a shortened two-step '
  'calibration ("show me your hand", "point at the star") gets even the youngest players started in seconds. '
  'Every menu — Sort by Shape, Sort by Color, Mixed Mode, Settings, Exit — is operated purely by hovering a '
  'fingertip over a glowing button, including gesture-driven volume sliders and toggles for colorblind-safe '
  'icons, high contrast, a larger cursor, a slower pace, and spoken narration. Stars and simple achievements '
  '(First Sort, Shape Master, Color Master, Mixed Master, Perfect Round, Super Sorter) are saved automatically '
  'so progress carries between sessions.',
  'Gesture-only sorting game for little hands: hover the matching basket to sort shapes and colors — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-indigo-950 via-purple-900 to-fuchsia-950',
  '#9B4FD6',
  4.7,
  2026,
  8,
  'easy',
  '3-6',
  'published',
  true
)
on conflict (id) do update set
  title             = excluded.title,
  tagline           = excluded.tagline,
  description       = excluded.description,
  short_description = excluded.short_description,
  category          = excluded.category,
  category_id       = excluded.category_id,
  players           = excluded.players,
  min_players       = excluded.min_players,
  max_players       = excluded.max_players,
  cover             = excluded.cover,
  accent            = excluded.accent,
  rating            = excluded.rating,
  release_year      = excluded.release_year,
  duration_minutes  = excluded.duration_minutes,
  difficulty        = excluded.difficulty,
  age_group         = excluded.age_group,
  status            = excluded.status,
  featured          = excluded.featured,
  updated_at        = now();

-- ----------------------------------------------------------------------------
-- Optional: verify the scores wiring after a few plays.
--
--   select s.score, s.achieved_at, u.name
--   from public.scores s
--   join public.users u on u.id = s.user_id
--   where s.game_id = 'shape-color-sorter'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
