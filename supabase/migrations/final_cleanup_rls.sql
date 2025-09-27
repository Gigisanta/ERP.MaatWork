-- Final cleanup to ensure no RLS policies remain
-- and grant proper permissions

-- Ensure RLS is disabled
ALTER TABLE historical_metrics_enhanced DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_config DISABLE ROW LEVEL SECURITY;

-- Drop any remaining policies (using IF EXISTS to avoid errors)
DO $$ 
BEGIN
    -- Drop all policies for historical_metrics_enhanced
    DROP POLICY IF EXISTS "Authenticated users can view historical metrics" ON historical_metrics_enhanced;
    DROP POLICY IF EXISTS "Authenticated users can insert historical metrics" ON historical_metrics_enhanced;
    DROP POLICY IF EXISTS "Authenticated users can update historical metrics" ON historical_metrics_enhanced;
    DROP POLICY IF EXISTS "Allow anon read access" ON historical_metrics_enhanced;
    DROP POLICY IF EXISTS "Users can insert their own historical metrics" ON historical_metrics_enhanced;
    
    -- Drop all policies for data_retention_config
    DROP POLICY IF EXISTS "Authenticated users can manage retention config" ON data_retention_config;
    DROP POLICY IF EXISTS "Users can manage retention config" ON data_retention_config;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if policies don't exist
        NULL;
END $$;

-- Revoke all existing permissions first
REVOKE ALL ON historical_metrics_enhanced FROM authenticated, anon;
REVOKE ALL ON data_retention_config FROM authenticated, anon;

-- Grant fresh permissions
GRANT ALL PRIVILEGES ON historical_metrics_enhanced TO authenticated;
GRANT SELECT, INSERT ON historical_metrics_enhanced TO anon;
GRANT ALL PRIVILEGES ON data_retention_config TO authenticated;
GRANT SELECT ON data_retention_config TO anon;

-- Ensure sequence permissions if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;