-- ============================================================================
-- KinetoFun — Gesture Ludo King catalog text for the rebuilt game
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  tagline           = 'Classic Ludo for one or two players against the computer, played by resting your hand.',
  description       = 'Rest your hand on the die to roll it, then rest it on a glowing pawn to move it; the board shows where '
                      'the pawn will land, and a move with only one choice plays itself. Play alone against three computers, '
                      'or two players take turns in front of the camera against two computers. Real Ludo rules: a 6 brings a '
                      'pawn out and rolls again, three 6s lose the turn, landing on a rival sends it back to base except on '
                      'star squares, and pawns need the exact number to get home. Easy or clever computers, and a quick game '
                      'with two pawns each.',
  short_description = 'Ludo with your hand: 1 player against 3 computers, or 2 players against 2.',
  min_players       = 1,
  max_players       = 2,
  updated_at        = now()
where id = 'gesture-ludo-king';
