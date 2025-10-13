-- Migration: Remove lifecycle_stage column from contacts table
-- Date: 2024-01-XX
-- Description: Eliminate lifecycle_stage column as we now use only pipeline stages

-- Drop the index on lifecycle_stage if it exists
DROP INDEX IF EXISTS idx_contacts_stage;

-- Remove the lifecycle_stage column
ALTER TABLE contacts DROP COLUMN IF EXISTS lifecycle_stage;

-- Add a comment explaining the change
COMMENT ON TABLE contacts IS 'Contacts table now uses only pipeline stages for stage management';
