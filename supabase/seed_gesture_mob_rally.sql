-- ============================================================================
-- KinetoFun — Mob Rally seed
-- Run in the Supabase Dashboard → SQL Editor (after migration 0004).
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'gesture-mob-rally',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/gesture-mob-rally/src/stores/useGameStore.ts via
-- window.parent.postMessage) will insert a row into public.scores for the
-- signed-in user with no further setup — there is no per-game scores table,
-- all games share the one table. Mob Rally also keeps its own local
-- (localStorage) leaderboard for offline/at-a-glance high scores.
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
  'gesture-mob-rally',
  'Mob Rally',
  'Grow Your Crowd. Rally to Victory.',
  'Lead a growing crowd of stick-figure runners using nothing but your hand! Steer with your wrist to '
  'sweep through multiplier gates, dodge crushing obstacles, crash into rival crowds, topple mini-bosses, '
  'and smash the castle at the end of every level. Make a fist to trigger Charge Mode and power through '
  'the toughest foes — your army glows, destroys weak obstacles, and defeats enemies faster for a few '
  'seconds. Hold an open palm to pause and resume, no controller needed. Procedurally generated levels '
  'across four unique worlds (Grassland, Desert, Snow, Volcano) mean no two runs are ever the same, with '
  'eight obstacle types, eight gate effects, seven power-ups, two boss archetypes, and unlockable '
  'cosmetics — helmets, capes, trails, auras and color themes — to customize your mob. An original crowd '
  'runner built from the ground up for camera-based, hands-only play.',
  'Gesture-controlled crowd runner — grow your mob, dodge obstacles, and smash the castle!',
  'Action',
  (select id from public.categories where slug = 'action' limit 1),
  'single',
  1,
  1,
  'linear-gradient(135deg, #2a1a3a 0%, #FF6B35 50%, #FFD740 100%)',
  '#FF6B35',
  4.8,
  2026,
  12,
  'medium',
  '8+',
  'published',
  true
)
on conflict (id) do update set
  title              = excluded.title,
  tagline            = excluded.tagline,
  description        = excluded.description,
  short_description  = excluded.short_description,
  category           = excluded.category,
  category_id        = excluded.category_id,
  cover              = excluded.cover,
  accent             = excluded.accent,
  difficulty         = excluded.difficulty,
  age_group          = excluded.age_group,
  status             = excluded.status,
  featured           = excluded.featured;

-- Example: top 10 scores for this game once players have run it.
-- select u.name, s.score, s.achieved_at
-- from public.scores s
-- join public.users u on u.id = s.user_id
-- where s.game_id = 'gesture-mob-rally'
-- order by s.score desc
-- limit 10;
