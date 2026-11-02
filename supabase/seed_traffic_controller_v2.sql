-- ============================================================================
-- KinetoFun — Traffic Controller catalog text for the rebuild with shifts
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  tagline           = 'Run the lights at a busy crossroads across 10 shifts.',
  description       = 'Cars queue on four roads and only one road can go at a time. Point your open hand at a road and make a fist '
                      'to give it the green light, or make a fist on the WALK button to let people cross. Keep the queues short, get '
                      'ambulances through fast, and don''t keep drivers waiting so long that they run the red. Get enough cars '
                      'through to finish each shift, from a quiet street to the grand junction.',
  short_description = 'Point and make a fist to switch the lights; keep a busy junction moving.',
  updated_at        = now()
where id = 'traffic-controller';
