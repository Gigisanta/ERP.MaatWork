-- Disable RLS for historical_metrics_enhanced table
-- This table is used for system-level metrics collection and doesn't need user-level security

-- Disable Row Level Security for historical_metrics_enhanced
ALTER TABLE historical_metrics_enhanced DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for historical_metrics_enhanced
DROP POLICY IF EXISTS "Authenticated users can view historical metrics" ON historical_metrics_enhanced;
DROP POLICY IF EXISTS "Authenticated users can insert historical metrics" ON historical_metrics_enhanced;
DROP POLICY IF EXISTS "Authenticated users can update historical metrics" ON historical_metrics_enhanced;
DROP POLICY IF EXISTS "Allow anon read access" ON historical_metrics_enhanced;

-- Grant full access to authenticated users and read access to anon users
GRANT ALL PRIVILEGES ON historical_metrics_enhanced TO authenticated;
GRANT SELECT ON historical_metrics_enhanced TO anon;

-- Also disable RLS for data_retention_config as it's system configuration
ALTER TABLE data_retention_config DISABLE ROW LEVEL SECURITY;

-- Drop existing policies for data_retention_config
DROP POLICY IF EXISTS "Authenticated users can manage retention config" ON data_retention_config;

-- Grant permissions for data_retention_config
GRANT ALL PRIVILEGES ON data_retention_config TO authenticated;
GRANT SELECT ON data_retention_config TO anon;

-- Keep RLS enabled for metric_alerts as it contains user-specific data
-- But ensure the policy is correct
DROP POLICY IF EXISTS "Users can manage their own metric alerts" ON metric_alerts;

CREATE POLICY "Users can manage their own metric alerts" ON metric_alerts
    FOR ALL USING (auth.uid()::text = user_id);

-- Grant permissions for metric_alerts
GRANT ALL PRIVILEGES ON metric_alerts TO authenticated;
GRANT SELECT ON metric_alerts TO anon;