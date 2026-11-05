-- ============================================================================
-- KinetoFun — Whack-a-Mole catalog text for the rebuild with levels
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  tagline           = 'Aim with your open hand, smash with a fist, across 10 carnival levels.',
  description       = 'Moles pop out of nine holes in a carnival arcade cabinet. Move your open hand to aim the hammer and close '
                      'it into a fist to smash. Golden moles are worth extra, moles in hard hats need two smashes, and bombs '
                      'cost a heart if you hit them. Ten hits in a row doubles your points. Reach each level''s score goal to '
                      'unlock the next, from First moles to the Mole King.',
  short_description = 'Smash moles with a fist across 10 levels; avoid the bombs.',
  updated_at        = now()
where id = 'whack-a-mole-hand';
