-- Migración para crear tablas del sistema CRM integrado con Notion
-- Fecha: 2024-01-20
-- Descripción: Crear tablas notion_workspaces y migration_logs con políticas RLS

-- Crear tabla notion_workspaces
CREATE TABLE notion_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    database_ids JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_workspace UNIQUE(user_id, workspace_id)
);

-- Crear índices para notion_workspaces
CREATE INDEX idx_notion_workspaces_user_id ON notion_workspaces(user_id);
CREATE INDEX idx_notion_workspaces_workspace_id ON notion_workspaces(workspace_id);
CREATE INDEX idx_notion_workspaces_active ON notion_workspaces(is_active);
CREATE INDEX idx_notion_workspaces_token_expires ON notion_workspaces(token_expires_at);

-- Habilitar RLS para notion_workspaces
ALTER TABLE notion_workspaces ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notion_workspaces
CREATE POLICY "Users can manage own workspaces" ON notion_workspaces
    FOR ALL USING (auth.uid() = user_id);

-- Crear tabla migration_logs
CREATE TABLE migration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    migration_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
    records_migrated INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para migration_logs
CREATE INDEX idx_migration_logs_user_id ON migration_logs(user_id);
CREATE INDEX idx_migration_logs_migration_id ON migration_logs(migration_id);
CREATE INDEX idx_migration_logs_status ON migration_logs(status);
CREATE INDEX idx_migration_logs_table_name ON migration_logs(table_name);
CREATE INDEX idx_migration_logs_created_at ON migration_logs(created_at);

-- Habilitar RLS para migration_logs
ALTER TABLE migration_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para migration_logs
CREATE POLICY "Users can view own migration logs" ON migration_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert migration logs" ON migration_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update migration logs" ON migration_logs
    FOR UPDATE USING (true);

-- Función para actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-actualizar updated_at en notion_workspaces
CREATE TRIGGER update_notion_workspaces_updated_at
    BEFORE UPDATE ON notion_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar completed_at en migration_logs
CREATE OR REPLACE FUNCTION update_migration_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-actualizar completed_at en migration_logs
CREATE TRIGGER update_migration_logs_completed_at
    BEFORE UPDATE ON migration_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_migration_completed_at();

-- Comentarios para documentación
COMMENT ON TABLE notion_workspaces IS 'Almacena configuraciones de workspaces de Notion para cada usuario';
COMMENT ON TABLE migration_logs IS 'Registra el progreso y estado de migraciones de datos a Notion';
COMMENT ON COLUMN notion_workspaces.database_ids IS 'JSON con IDs de bases de datos CRM creadas en Notion';
COMMENT ON COLUMN migration_logs.migration_id IS 'Identificador único del proceso de migración';
COMMENT ON COLUMN migration_logs.error_details IS 'Detalles de errores en formato JSON';

-- Grants de permisos para roles anon y authenticated
GRANT SELECT, INSERT, UPDATE ON notion_workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON migration_logs TO authenticated;
GRANT SELECT ON notion_workspaces TO anon;
GRANT SELECT ON migration_logs TO anon;