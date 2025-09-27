-- Fix missing columns in database tables

-- Add missing 'active_contacts' column to historical_metrics table
ALTER TABLE historical_metrics 
ADD COLUMN IF NOT EXISTS active_contacts INTEGER DEFAULT 0;

-- Add constraint to ensure active_contacts is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_active_contacts_positive' 
        AND table_name = 'historical_metrics'
    ) THEN
        ALTER TABLE historical_metrics 
        ADD CONSTRAINT check_active_contacts_positive 
        CHECK (active_contacts >= 0);
    END IF;
END $$;

-- Add missing 'is_active' column to data_retention_config table
ALTER TABLE data_retention_config 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON historical_metrics TO anon;
GRANT ALL PRIVILEGES ON historical_metrics TO authenticated;
GRANT SELECT ON data_retention_config TO anon;
GRANT ALL PRIVILEGES ON data_retention_config TO authenticated;

-- Update any existing records to have default values
UPDATE historical_metrics SET active_contacts = 0 WHERE active_contacts IS NULL;
UPDATE data_retention_config SET is_active = true WHERE is_active IS NULL;