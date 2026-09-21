-- ============================================================================
-- KinetoFun — Gesture Basketball game seed
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
  'gesture-basketball',
  'Gesture Basketball',
  'Arc perfect free throws with your bare hands.',
  'Gesture Basketball puts you on the free-throw line with a real basketball hoop to aim for. '
  'Your camera becomes the controller: move your hand left and right to adjust your arc angle '
  '(wrist X position maps directly to launch angle, with the center position giving a perfect '
  '55-degree trajectory). Watch the oscillating power meter on the left — it swings between '
  'weak and strong continuously. Raise your hand sharply above your head to release the shot '
  'at whatever power value the meter is showing at that moment. Time your raise to hit the '
  'green sweet-zone on the meter for the ideal arc. '
  'You get 10 free throw attempts per game; each basket scores 10 points for a maximum of '
  '100. The ball can also bounce off the backboard for a classic bank shot. '
  'Three difficulty levels change how forgiving the rim is and how fast the power meter '
  'oscillates: Easy (50px scoring zone, 4-second period), Normal (33px zone, 2.6-second '
  'period), Hard (18px zone, 1.8-second period — precision only). '
  'All menus are navigated by hand-dwell — no keyboard required. '
  'Final score is saved to the leaderboard on game end.',
  'Raise your hand to shoot free throws — aim with wrist X, time the power meter.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-orange-500 via-red-600 to-orange-800',
  '#fb923c',
  4.6,
  2026,
  8,
  'medium',
  '7+',
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
