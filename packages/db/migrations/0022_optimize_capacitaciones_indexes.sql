-- Migration: Optimize capacitaciones indexes for better query performance
-- Adds GIN trigram index for text search, composite index for tema+created_at filtering,
-- and index for createdAt ordering

-- Enable pg_trgm extension for trigram text search (if not already enabled)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension could not be created. You may need to run this manually as superuser.';
END $$;
--> statement-breakpoint

-- GIN index with trigram for efficient ILIKE searches on titulo
-- This dramatically improves performance for searches like '%texto%'
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_titulo_trgm" ON "capacitaciones" USING gin ("titulo" gin_trgm_ops);
--> statement-breakpoint

-- Composite index for filtering by tema with ordering by created_at DESC
-- Optimizes queries that filter by tema and order by creation date
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_tema_created_at" ON "capacitaciones" USING btree ("tema", "created_at" DESC);
--> statement-breakpoint

-- Index for ordering by created_at DESC (general ordering)
-- Optimizes queries that order by creation date without tema filter
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_created_at_desc" ON "capacitaciones" USING btree ("created_at" DESC);
--> statement-breakpoint





