-- ============================================================================
-- KinetoFun — Gesture Hill Adventure seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
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
  'gesture-hill-adventure',
  'Gesture Hill Adventure',
  'Raise your hand to drive, lower it to brake, and conquer endless procedural hills.',
  'Gesture Hill Adventure is a physics-based hill-climb racing game controlled entirely by your hand — '
  'no keyboard, mouse, or controller needed. Raise your open hand to hit the throttle and send your '
  'cartoon buggy climbing over steep procedural hills; lower it to brake before the next drop; and make '
  'a fist for a short turbo boost to launch off ramps and nail big air. Your buggy is powered by a '
  'real physics engine with suspension springs, weighted chassis, and freely spinning wheels, so every '
  'hill crests differently and landings carry real momentum. '
  'Drive through six gorgeous environments that rotate automatically as you push further — lush Forest, '
  'scorching Desert, icy Snow, fiery Volcano, low-gravity Moon, and the surreal Candy World — each with '
  'its own parallax sky, terrain palette, ambient particles (snowflakes, lava sparks, candy confetti), '
  'and sound atmosphere. '
  'Perform backflips, frontflips, and double flips to earn stunt bonuses and build a combo multiplier. '
  'Nail a perfect landing (gentle touchdown) for extra points. Fly high enough to trigger a Big Jump '
  'bonus, or stay airborne for an Air Time streak. Combo chains are displayed on canvas in real time — '
  'let the timer run out and the multiplier resets. '
  'Collect spinning gold coins and glowing fuel canisters scattered across the hills. Managing your fuel '
  'gauge is critical: it drains while driving and boosts drain it faster — pick up canisters to keep '
  'going. Run dry or flip upside-down too long and it''s game over. '
  'Six unlockable vehicle skins are available in the Garage — earn coins in-game to purchase the Monster '
  'Crusher, Beach Cruiser, Patrol Cruiser, Space Rover, and Neon Racer. Every menu screen is '
  'gesture-driven: hover your cursor over a button for one second to activate it, giving you full '
  'hands-free navigation. Statistics, best distance, high scores, coins, unlocked skins, and settings '
  'are all saved locally between sessions.',
  'Physics hill-climb racer: raise hand to throttle, lower to brake, fist to boost. Flip stunts, 6 environments, garage skins.',
  'Racing',
  (select id from public.categories where slug = 'racing' limit 1),
  'single',
  1,
  1,
  'from-green-900 via-emerald-900 to-teal-950',
  '#10b981',
  4.8,
  2026,
  10,
  'normal',
  '5+',
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
