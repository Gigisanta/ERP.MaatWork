-- Migration: Remove SLA fields from database
-- Description: Eliminates all SLA-related columns and indexes

-- Drop index first
DROP INDEX IF EXISTS idx_contacts_sla_status;

-- Remove SLA columns from contacts table
ALTER TABLE contacts DROP COLUMN IF EXISTS sla_status;
ALTER TABLE contacts DROP COLUMN IF EXISTS sla_due_at;

-- Remove SLA columns from pipeline_stages table
ALTER TABLE pipeline_stages DROP COLUMN IF EXISTS sla_hours;


