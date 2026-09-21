-- Run this as the RDS master user (postgres / table owner), NOT as kintofun_user.
-- Connection: host sis-fma.ccul0nt3fjm0.eu-central-1.rds.amazonaws.com, db kinetofun
--
-- Supabase schema shipped with RLS enabled and zero policies. That locked the
-- anon key there; against a normal Postgres role it blocks ALL writes.

BEGIN;

ALTER TABLE public.users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.games            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_ratings     DISABLE ROW LEVEL SECURITY;

-- older leftover table name if present
DO $$ BEGIN
  ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

GRANT USAGE ON SCHEMA public TO kintofun_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kintofun_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kintofun_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO kintofun_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kintofun_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kintofun_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO kintofun_user;

INSERT INTO public.platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
