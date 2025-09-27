-- Fix RLS policies for historical_metrics_enhanced table
-- The current policies are too restrictive and prevent system-level metric insertions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own historical metrics" ON historical_metrics_enhanced;
DROP POLICY IF EXISTS "Users can insert their own historical metrics" ON historical_metrics_enhanced;
DROP POLICY IF EXISTS "Users can update their own historical metrics" ON historical_metrics_enhanced;

-- Create more flexible policies that allow system-level operations
-- Allow authenticated users to view all metrics (for dashboard functionality)
CREATE POLICY "Authenticated users can view historical metrics" ON historical_metrics_enhanced
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert metrics (system can insert without user_id)
CREATE POLICY "Authenticated users can insert historical metrics" ON historical_metrics_enhanced
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update metrics they own or system metrics (user_id is null)
CREATE POLICY "Authenticated users can update historical metrics" ON historical_metrics_enhanced
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (user_id IS NULL OR auth.uid()::text = user_id)
    );

-- Allow anon users to view metrics (for public dashboards if needed)
CREATE POLICY "Allow anon read access" ON historical_metrics_enhanced
    FOR SELECT USING (auth.role() = 'anon');

-- Update similar policies for other tables
-- Fix data_retention_config policies
DROP POLICY IF EXISTS "Users can view their own retention config" ON data_retention_config;
DROP POLICY IF EXISTS "Users can insert their own retention config" ON data_retention_config;
DROP POLICY IF EXISTS "Users can update their own retention config" ON data_retention_config;

CREATE POLICY "Authenticated users can manage retention config" ON data_retention_config
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (user_id IS NULL OR auth.uid()::text = user_id)
    );

-- Fix metric_alerts policies
DROP POLICY IF EXISTS "Users can view their own metric alerts" ON metric_alerts;
DROP POLICY IF EXISTS "Users can insert their own metric alerts" ON metric_alerts;
DROP POLICY IF EXISTS "Users can update their own metric alerts" ON metric_alerts;
DROP POLICY IF EXISTS "Users can delete their own metric alerts" ON metric_alerts;

CREATE POLICY "Users can manage their own metric alerts" ON metric_alerts
    FOR ALL USING (auth.uid()::text = user_id);

-- Ensure proper permissions are granted
GRANT ALL PRIVILEGES ON historical_metrics_enhanced TO authenticated;
GRANT SELECT ON historical_metrics_enhanced TO anon;
GRANT ALL PRIVILEGES ON data_retention_config TO authenticated;
GRANT SELECT ON data_retention_config TO anon;
GRANT ALL PRIVILEGES ON metric_alerts TO authenticated;
GRANT SELECT ON metric_alerts TO anon;