-- AI_DECISION: Add username fields and unique index to support username login
-- Justificación: Permitir autenticación por username insensible a mayúsculas con consultas rápidas
-- Impacto: Nuevas columnas en users y constraint único parcial sobre username_normalized

BEGIN;

-- 1) Add nullable columns so deploy is non-breaking
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username" text,
  ADD COLUMN IF NOT EXISTS "username_normalized" text;

-- 2) Unique partial index to enforce uniqueness when set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_username_normalized_unique'
  ) THEN
    CREATE UNIQUE INDEX "users_username_normalized_unique"
      ON "users" ("username_normalized")
      WHERE username_normalized IS NOT NULL;
  END IF;
END $$;

-- 3) Optional helper btree index (usually redundant with unique index) kept for clarity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_users_username_normalized'
  ) THEN
    CREATE INDEX "idx_users_username_normalized"
      ON "users" ("username_normalized")
      WHERE username_normalized IS NOT NULL;
  END IF;
END $$;

COMMIT;



