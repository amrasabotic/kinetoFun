-- ============================================================================
-- KinetoFun — Gesture Darts seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'gesture-darts',
-- score } (called automatically by GameIframe -> GAME_COMPLETE, wired in
-- games/gesture-darts/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores with no further setup.
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
  'gesture-darts',
  'Gesture Darts',
  'Aim with your finger, draw back a fist, and open your hand to release — real 301, 501, and Cricket rules against a CPU opponent.',
  'Gesture Darts brings the exact aim/draw/release gesture flow this platform''s archery and mini-golf games already use to a '
  'real dartboard: the index finger moves the aiming reticle at all times, closing a fist draws back and charges a power '
  'meter, and opening the hand releases the dart. The dartboard itself is modeled with regulation proportions (double-bull, '
  'bull, triple ring, and double ring computed from real board measurements) so where a dart lands is genuinely determined '
  'by aim and throw strength, not a simplified target. Three authentic game modes are supported: 301 and 501 (classic '
  'countdown play with real bust rules — going below zero, landing on a score of 1, or reaching zero without the final dart '
  'being a double all void the entire turn) and Cricket (closing the 15 through 20 numbers and the bull with three marks '
  'each, then scoring extra hits against an opponent who hasn''t closed the same number). A turn-based CPU opponent throws '
  'its own three darts every other turn through the identical scoring engine the player uses, with three difficulty tiers '
  'controlling only how shaky its simulated aim is — Easy misses its intended target by a wide margin, Hard is a nearly '
  'precise thrower. A Daily Challenge seeds the CPU''s throws identically for every player on a given day. A two-hands-raised '
  'gesture restarts the match instantly, and every HUD control is a hover-dwell button, matching the platform-wide '
  '"no clicks" convention. Web Audio synthesis provides distinct tones for triples, doubles, bullseyes, busts, and match '
  'victory/defeat; match results (wins, best score per mode+difficulty, daily completion) persist to localStorage.',
  'A gesture-only darts game: aim with your finger, draw a fist, release to throw — real 301/501/Cricket vs a CPU.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-orange-950 via-stone-900 to-amber-950',
  '#FB923C',
  4.6,
  2026,
  8,
  'medium',
  '6-12',
  'published',
  false
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
--   where s.game_id = 'gesture-darts'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
