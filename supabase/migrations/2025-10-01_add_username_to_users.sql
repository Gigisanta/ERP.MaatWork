-- Add username column to public.users for app-level identity
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS index)

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text;

-- Optional: unique constraint (case-insensitive), ignoring NULLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_username_unique'
  ) THEN
    CREATE UNIQUE INDEX users_username_unique
      ON public.users ((lower(username)))
      WHERE username IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.users.username IS 'Application username (unique case-insensitive; nullable)';

COMMIT;


