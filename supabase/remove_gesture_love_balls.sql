-- ============================================================================
-- KinetoFun — remove Gesture Love Balls from the catalog
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Its scores and sessions go with it (on delete cascade).
-- Safe to re-run.
-- ============================================================================

delete from public.games where id = 'gesture-love-balls';
