-- ============================================================================
-- KinetoFun — Mix It Up catalog text for the potion shop rebuild
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  tagline           = 'Run a potion shop: mix the colours your customers ask for.',
  description       = 'Customers come to your potion shop and ask for a colour. Move your open hand to steer the spoon, make a fist '
                      'over a jar to scoop, and open your hand over the pot to drop it in. Red and yellow make orange, yellow and '
                      'blue make green, and white and black make colours lighter or darker. Bottle the brew and hand it over before '
                      'the customer gets tired of waiting. Ten days take you from plain red to four-scoop master mixes.',
  short_description = 'Mix potion colours for customers across 10 days in the shop.',
  category          = 'Puzzle',
  updated_at        = now()
where id = 'mix-it-up';
