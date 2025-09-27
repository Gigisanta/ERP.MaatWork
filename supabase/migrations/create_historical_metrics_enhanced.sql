-- Create enhanced historical metrics tables for data visualization system
-- Based on technical architecture documentation

-- Crear tabla mejorada para métricas históricas
CREATE TABLE IF NOT EXISTS historical_metrics_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    team_id VARCHAR(255),
    date DATE NOT NULL,
    granularity VARCHAR(10) DEFAULT 'daily' CHECK (granularity IN ('daily', 'monthly')),
    
    -- Métricas de contactos
    total_contacts INTEGER DEFAULT 0 CHECK (total_contacts >= 0),
    new_contacts INTEGER DEFAULT 0 CHECK (new_contacts >= 0),
    active_contacts INTEGER DEFAULT 0 CHECK (active_contacts >= 0),
    pipeline_contacts INTEGER DEFAULT 0 CHECK (pipeline_contacts >= 0),
    
    -- Métricas de conversión
    converted_contacts INTEGER DEFAULT 0 CHECK (converted_contacts >= 0),
    conversion_rate DECIMAL(5,2) DEFAULT 0 CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
    average_conversion_time DECIMAL(8,2) DEFAULT 0 CHECK (average_conversion_time >= 0),
    
    -- Métricas de valor
    pipeline_value DECIMAL(12,2) DEFAULT 0 CHECK (pipeline_value >= 0),
    closed_value DECIMAL(12,2) DEFAULT 0 CHECK (closed_value >= 0),
    average_deal_size DECIMAL(10,2) DEFAULT 0 CHECK (average_deal_size >= 0),
    total_value DECIMAL(12,2) DEFAULT 0 CHECK (total_value >= 0),
    
    -- Metadatos
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_quality_score DECIMAL(3,2) DEFAULT 1.00 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date, granularity)
);

-- Crear índices optimizados
CREATE INDEX IF NOT EXISTS idx_historical_metrics_enhanced_user_date 
    ON historical_metrics_enhanced(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_enhanced_team_date 
    ON historical_metrics_enhanced(team_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_enhanced_granularity 
    ON historical_metrics_enhanced(granularity, date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_enhanced_calculated_at 
    ON historical_metrics_enhanced(calculated_at DESC);

-- Tabla para configuración de retención de datos
CREATE TABLE IF NOT EXISTS data_retention_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE,
    daily_retention_days INTEGER DEFAULT 90 CHECK (daily_retention_days > 0),
    monthly_retention_months INTEGER DEFAULT 24 CHECK (monthly_retention_months > 0),
    auto_archive_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para alertas de métricas
CREATE TABLE IF NOT EXISTS metric_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_type VARCHAR(20) CHECK (threshold_type IN ('above', 'below', 'change')),
    threshold_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para limpiar datos antiguos automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_historical_data()
RETURNS void AS $$
DECLARE
    config_record RECORD;
BEGIN
    FOR config_record IN 
        SELECT user_id, daily_retention_days, monthly_retention_months 
        FROM data_retention_config 
        WHERE auto_archive_enabled = true
    LOOP
        -- Limpiar datos diarios antiguos
        DELETE FROM historical_metrics_enhanced 
        WHERE user_id = config_record.user_id 
            AND granularity = 'daily'
            AND date < (CURRENT_DATE - INTERVAL '1 day' * config_record.daily_retention_days);
        
        -- Limpiar datos mensuales antiguos
        DELETE FROM historical_metrics_enhanced 
        WHERE user_id = config_record.user_id 
            AND granularity = 'monthly'
            AND date < (CURRENT_DATE - INTERVAL '1 month' * config_record.monthly_retention_months);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Datos iniciales para configuración de retención
INSERT INTO data_retention_config (user_id, daily_retention_days, monthly_retention_months)
SELECT DISTINCT assigned_to, 90, 24
FROM contacts 
WHERE assigned_to IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE historical_metrics_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for historical_metrics_enhanced
CREATE POLICY "Users can view their own historical metrics" ON historical_metrics_enhanced
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own historical metrics" ON historical_metrics_enhanced
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own historical metrics" ON historical_metrics_enhanced
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create RLS policies for data_retention_config
CREATE POLICY "Users can view their own retention config" ON data_retention_config
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own retention config" ON data_retention_config
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own retention config" ON data_retention_config
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create RLS policies for metric_alerts
CREATE POLICY "Users can view their own metric alerts" ON metric_alerts
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own metric alerts" ON metric_alerts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own metric alerts" ON metric_alerts
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own metric alerts" ON metric_alerts
    FOR DELETE USING (auth.uid()::text = user_id);

-- Grant permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE ON historical_metrics_enhanced TO authenticated;
GRANT SELECT, INSERT, UPDATE ON data_retention_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON metric_alerts TO authenticated;
GRANT SELECT ON historical_metrics_enhanced TO anon;
GRANT SELECT ON data_retention_config TO anon;
GRANT SELECT ON metric_alerts TO anon;