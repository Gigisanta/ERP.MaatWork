-- Migración completa del sistema CRM Notion optimizado
-- Fecha: 2025-01-20
-- Descripción: Crear todas las tablas del modelo de datos optimizado con índices y RLS

-- Crear tabla de logs de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES notion_workspaces(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    sync_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Crear tabla de salud de conexiones
CREATE TABLE IF NOT EXISTS connection_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES notion_workspaces(id) ON DELETE CASCADE,
    health_status VARCHAR(20) NOT NULL CHECK (health_status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms INTEGER,
    last_error JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de preferencias de usuario
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crm_settings JSONB DEFAULT '{}',
    sync_preferences JSONB DEFAULT '{"frequency": "hourly", "auto_sync": true}',
    ui_preferences JSONB DEFAULT '{"theme": "light", "density": "comfortable"}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Crear tabla de errores de sincronización
CREATE TABLE IF NOT EXISTS sync_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID NOT NULL REFERENCES sync_logs(id) ON DELETE CASCADE,
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columnas faltantes a notion_workspaces si no existen
DO $$
BEGIN
    -- Agregar workspace_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='workspace_name') THEN
        ALTER TABLE notion_workspaces ADD COLUMN workspace_name VARCHAR(255);
    END IF;
    
    -- Agregar encrypted_access_token si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='encrypted_access_token') THEN
        ALTER TABLE notion_workspaces ADD COLUMN encrypted_access_token TEXT;
    END IF;
    
    -- Agregar bot_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='bot_id') THEN
        ALTER TABLE notion_workspaces ADD COLUMN bot_id VARCHAR(255);
    END IF;
    
    -- Agregar contacts_database_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='contacts_database_id') THEN
        ALTER TABLE notion_workspaces ADD COLUMN contacts_database_id VARCHAR(255);
    END IF;
    
    -- Agregar deals_database_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='deals_database_id') THEN
        ALTER TABLE notion_workspaces ADD COLUMN deals_database_id VARCHAR(255);
    END IF;
    
    -- Agregar tasks_database_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='tasks_database_id') THEN
        ALTER TABLE notion_workspaces ADD COLUMN tasks_database_id VARCHAR(255);
    END IF;
    
    -- Agregar last_sync_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notion_workspaces' AND column_name='last_sync_at') THEN
        ALTER TABLE notion_workspaces ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Actualizar columna access_token a encrypted_access_token si es necesario
UPDATE notion_workspaces 
SET encrypted_access_token = access_token 
WHERE encrypted_access_token IS NULL AND access_token IS NOT NULL;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_notion_workspaces_user_active ON notion_workspaces(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace_status ON sync_logs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_health_workspace ON connection_health(workspace_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_errors_sync_log ON sync_errors(sync_log_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Configurar RLS (Row Level Security) para nuevas tablas
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their sync logs" ON sync_logs;
    DROP POLICY IF EXISTS "System can manage sync logs" ON sync_logs;
    DROP POLICY IF EXISTS "System can update sync logs" ON sync_logs;
    DROP POLICY IF EXISTS "Users can view their connection health" ON connection_health;
    DROP POLICY IF EXISTS "System can manage connection health" ON connection_health;
    DROP POLICY IF EXISTS "Users can manage their preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can view their sync errors" ON sync_errors;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Políticas de seguridad para nuevas tablas
CREATE POLICY "Users can view their sync logs" ON sync_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = sync_logs.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "System can manage sync logs" ON sync_logs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = sync_logs.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "System can update sync logs" ON sync_logs
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = sync_logs.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their connection health" ON connection_health
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = connection_health.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "System can manage connection health" ON connection_health
    FOR ALL USING (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = connection_health.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their sync errors" ON sync_errors
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sync_logs sl 
        JOIN notion_workspaces nw ON nw.id = sl.workspace_id 
        WHERE sl.id = sync_errors.sync_log_id AND nw.user_id = auth.uid()
    ));

-- Permisos para roles
GRANT SELECT ON sync_logs TO anon;
GRANT ALL PRIVILEGES ON sync_logs TO authenticated;
GRANT SELECT ON connection_health TO anon;
GRANT ALL PRIVILEGES ON connection_health TO authenticated;
GRANT ALL PRIVILEGES ON user_preferences TO authenticated;
GRANT SELECT ON sync_errors TO authenticated;

-- Eliminar triggers y funciones existentes si existen
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_notion_workspaces_updated_at ON notion_workspaces;
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
    DROP TRIGGER IF EXISTS update_sync_logs_completed_at ON sync_logs;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Funciones para triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_sync_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_notion_workspaces_updated_at
    BEFORE UPDATE ON notion_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_logs_completed_at
    BEFORE UPDATE ON sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_completed_at();

-- Comentarios para documentación
COMMENT ON TABLE sync_logs IS 'Logs detallados de procesos de sincronización';
COMMENT ON TABLE connection_health IS 'Monitoreo de salud de conexiones con Notion';
COMMENT ON TABLE user_preferences IS 'Preferencias personalizadas de usuario para el CRM';
COMMENT ON TABLE sync_errors IS 'Errores detallados de procesos de sincronización';

-- Datos iniciales para configuración por defecto
INSERT INTO user_preferences (user_id, crm_settings, sync_preferences, ui_preferences)
SELECT 
    id,
    '{"default_view": "dashboard", "notifications": true}',
    '{"frequency": "hourly", "auto_sync": true, "batch_size": 100}',
    '{"theme": "light", "density": "comfortable", "sidebar_collapsed": false}'
FROM auth.users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;