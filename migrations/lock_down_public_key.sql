-- Close the database to the public ("publishable"/anon) key.
--
-- WHY: tables without Row Level Security are fully readable (and writable) with the
-- public key, including users.password hashes. Views are readable even when their
-- tables have RLS, because a view runs with its owner's rights.
--
-- !!! RUN ONLY AFTER CHECKING THIS, OR THE APP STOPS WORKING !!!
--   Open https://<backend>/api/verify for this app's LIVE backend.
--   "supabase_key_type" must be "secret". If it says "publishable" or "legacy",
--   first set SUPABASE_SECRET_KEY in Vercel (Settings -> Environment Variables), redeploy,
--   and check again.
--
-- The backend uses the secret key (service_role), which ignores RLS and these grants,
-- so the app keeps working. Nothing in the frontends talks to Supabase directly.
-- Safe to run more than once.

-- 1. Row Level Security on every table (no policies = the public key sees nothing).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c
           WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- 2. The public roles get no rights on tables, views, sequences or functions,
--    now or for objects created later.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

-- The backend role keeps full access (it bypasses RLS).
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload schema';

-- Check afterwards (both should return 0 rows):
--   select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
--   select table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';
