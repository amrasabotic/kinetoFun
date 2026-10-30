-- ============================================================================
-- KinetoFun — Bubble Bath Bakery catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'bubble-bath-bakery',
  'Bubble Bath Bakery',
  'Knead, roll, bake and decorate treats for animal customers, all with your hands.',
  'Animal customers come to the bakery with orders. Open and close your hand to knead the dough, sweep it left and '
  'right to roll it, make a fist when the oven needle reaches the golden zone, and rest your hand on the topping jars '
  'the customer asked for. Ten days go from cookies to a big birthday cake with more customers and a narrower golden '
  'zone; every customer gets their treat, and golden bakes earn the most stars.',
  'Bake treats for animal customers by hand: knead, roll, bake in the golden zone and decorate.',
  'Adventure',
  (select id from public.categories where slug = 'adventure' limit 1),
  'single', 1, 1,
  'from-emerald-100 via-pink-200 to-amber-200',
  '#FF8FB8',
  4.5, 2026, 8, 'easy', '4-10', 'published', false
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
