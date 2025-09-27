-- Migración principal para el sistema CRM Notion optimizado
-- Crear todas las tablas necesarias con índices y políticas RLS

-- Crear tabla de workspaces Notion optimizada
CREATE TABLE notion_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id VARCHAR(255) NOT NULL,
    workspace_name VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    bot_id VARCHAR(255),
    contacts_database_id VARCHAR(255),
    deals_database_id VARCHAR(255),
    tasks_database_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, workspace_id)
);

-- Crear tabla de logs de sincronización
CREATE TABLE sync_logs (
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
CREATE TABLE connection_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES notion_workspaces(id) ON DELETE CASCADE,
    health_status VARCHAR(20) NOT NULL CHECK (health_status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms INTEGER,
    last_error JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de preferencias de usuario
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crm_settings JSONB DEFAULT '{}',
    sync_preferences JSONB DEFAULT '{"frequency": "hourly", "auto_sync": true}',
    ui_preferences JSONB DEFAULT '{"theme": "light", "density": "comfortable"}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Crear tabla de errores de sincronización
CREATE TABLE sync_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID NOT NULL REFERENCES sync_logs(id) ON DELETE CASCADE,
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimización de performance
CREATE INDEX idx_notion_workspaces_user_active ON notion_workspaces(user_id, is_active);
CREATE INDEX idx_notion_workspaces_workspace_id ON notion_workspaces(workspace_id);
CREATE INDEX idx_sync_logs_workspace_status ON sync_logs(workspace_id, status);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(started_at DESC);
CREATE INDEX idx_connection_health_workspace ON connection_health(workspace_id, checked_at DESC);
CREATE INDEX idx_sync_errors_sync_log ON sync_errors(sync_log_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Configurar RLS (Row Level Security)
ALTER TABLE notion_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para notion_workspaces
CREATE POLICY "Users can manage their own workspaces" ON notion_workspaces
    FOR ALL USING (auth.uid() = user_id);

-- Políticas de seguridad para sync_logs
CREATE POLICY "Users can view their sync logs" ON sync_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = sync_logs.workspace_id AND nw.user_id = auth.uid()
    ));

CREATE POLICY "System can insert sync logs" ON sync_logs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM notion_workspaces nw 
        WHERE nw.id = sync_logs.workspace_id AND nw.user_id = auth.uid()
    ));

-- Políticas de seguridad para connection_health
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

-- Políticas de seguridad para user_preferences
CREATE POLICY "Users can manage their preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Políticas de seguridad para sync_errors
CREATE POLICY "Users can view their sync errors" ON sync_errors
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sync_logs sl 
        JOIN notion_workspaces nw ON nw.id = sl.workspace_id 
        WHERE sl.id = sync_errors.sync_log_id AND nw.user_id = auth.uid()
    ));

-- Permisos para roles anon y authenticated
GRANT SELECT ON notion_workspaces TO anon;
GRANT ALL PRIVILEGES ON notion_workspaces TO authenticated;
GRANT SELECT ON sync_logs TO anon;
GRANT ALL PRIVILEGES ON sync_logs TO authenticated;
GRANT SELECT ON connection_health TO anon;
GRANT ALL PRIVILEGES ON connection_health TO authenticated;
GRANT ALL PRIVILEGES ON user_preferences TO authenticated;
GRANT SELECT ON sync_errors TO authenticated;
GRANT INSERT ON sync_errors TO authenticated;

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_notion_workspaces_updated_at BEFORE UPDATE ON notion_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE notion_workspaces IS 'Almacena información de workspaces de Notion conectados por usuario';
COMMENT ON TABLE sync_logs IS 'Registra logs de sincronización entre el sistema y Notion';
COMMENT ON TABLE connection_health IS 'Monitorea el estado de salud de las conexiones con Notion';
COMMENT ON TABLE user_preferences IS 'Configuraciones personalizadas por usuario';
COMMENT ON TABLE sync_errors IS 'Errores específicos ocurridos durante la sincronización';