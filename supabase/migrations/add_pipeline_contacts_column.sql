-- Add missing pipeline_contacts column to historical_metrics table
-- This fixes the error: Could not find the 'pipeline_contacts' column

ALTER TABLE historical_metrics 
ADD COLUMN pipeline_contacts INTEGER DEFAULT 0;

-- Add check constraint to ensure non-negative values
ALTER TABLE historical_metrics 
ADD CONSTRAINT check_pipeline_contacts_non_negative 
CHECK (pipeline_contacts >= 0);

-- Add comment for documentation
COMMENT ON COLUMN historical_metrics.pipeline_contacts IS 'Number of contacts currently in the sales pipeline';