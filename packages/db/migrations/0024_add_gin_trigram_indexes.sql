-- Migration: Add GIN trigram indexes for text search optimization
-- Adds GIN trigram indexes for efficient ILIKE searches on contacts.fullName and contacts.email

-- Enable pg_trgm extension for trigram text search (if not already enabled)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension could not be created. You may need to run this manually as superuser.';
END $$;
--> statement-breakpoint

-- GIN index with trigram for efficient ILIKE searches on contacts.fullName
-- This dramatically improves performance for searches like '%texto%'
CREATE INDEX IF NOT EXISTS "idx_contacts_full_name_trgm" ON "contacts" USING gin ("full_name" gin_trgm_ops);
--> statement-breakpoint

-- GIN index with trigram for efficient ILIKE searches on contacts.email
-- This dramatically improves performance for searches like '%texto%'
CREATE INDEX IF NOT EXISTS "idx_contacts_email_trgm" ON "contacts" USING gin ("email" gin_trgm_ops);
--> statement-breakpoint

