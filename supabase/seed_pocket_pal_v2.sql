-- ============================================================================
-- KinetoFun — Pocket Pal catalog text for the pet show rebuild
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  title             = 'Pocket Pal Pet Show',
  tagline           = 'Train your pet with hand games and win the shows!',
  description       = 'Adopt a puppy, kitten, bunny or baby dragon and train its four skills with four hand games: pump your '
                      'hand to sprint, raise it to jump hurdles, hit the lit pads on the beat to dance, and repeat the pad '
                      'order in memory. Then enter shows against rival pets, where judges score how well you play and how well '
                      'trained your pet is. Win rosettes and trophies from the Village Fair all the way to the Grand Champion Show.',
  short_description = 'Train your pet with four hand games and win pet shows.',
  updated_at        = now()
where id = 'pocket-pal';
