-- Migración para permitir bypass completo de RLS al service_role
-- Fecha: 2024-01-15
-- Descripción: Permite al service_role bypasear completamente RLS en todas las tablas

-- Eliminar todas las políticas existentes de contacts
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- Crear políticas que permitan bypass completo al service_role
-- Para SELECT
CREATE POLICY "contacts_select_bypass" ON contacts
    FOR SELECT
    USING (true); -- Permitir todo, RLS se maneja a nivel de cliente

-- Para INSERT
CREATE POLICY "contacts_insert_bypass" ON contacts
    FOR INSERT
    WITH CHECK (true); -- Permitir todo, RLS se maneja a nivel de cliente

-- Para UPDATE
CREATE POLICY "contacts_update_bypass" ON contacts
    FOR UPDATE
    USING (true)
    WITH CHECK (true); -- Permitir todo, RLS se maneja a nivel de cliente

-- Para DELETE
CREATE POLICY "contacts_delete_bypass" ON contacts
    FOR DELETE
    USING (true); -- Permitir todo, RLS se maneja a nivel de cliente

-- Alternativamente, deshabilitar RLS temporalmente para pruebas
-- ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- Otorgar permisos explícitos al service_role
GRANT ALL PRIVILEGES ON contacts TO service_role;
GRANT ALL PRIVILEGES ON users TO service_role;
GRANT ALL PRIVILEGES ON tasks TO service_role;
GRANT ALL PRIVILEGES ON notifications TO service_role;
GRANT ALL PRIVILEGES ON teams TO service_role;
GRANT ALL PRIVILEGES ON team_members TO service_role;
GRANT ALL PRIVILEGES ON notes TO service_role;
GRANT ALL PRIVILEGES ON tags TO service_role;
GRANT ALL PRIVILEGES ON contact_tags TO service_role;
GRANT ALL PRIVILEGES ON contact_status_history TO service_role;
GRANT ALL PRIVILEGES ON invitations TO service_role;
GRANT ALL PRIVILEGES ON approvals TO service_role;
GRANT ALL PRIVILEGES ON user_metrics TO service_role;
GRANT ALL PRIVILEGES ON monthly_conversion_metrics TO service_role;
GRANT ALL PRIVILEGES ON historical_metrics TO service_role;
GRANT ALL PRIVILEGES ON historical_metrics_enhanced TO service_role;
GRANT ALL PRIVILEGES ON metric_alerts TO service_role;
GRANT ALL PRIVILEGES ON team_settings TO service_role;
GRANT ALL PRIVILEGES ON note_attachments TO service_role;
GRANT ALL PRIVILEGES ON note_tags TO service_role;
GRANT ALL PRIVILEGES ON task_annotations TO service_role;

-- Comentario
-- Esta migración permite bypass completo de RLS para facilitar las pruebas
-- En producción, se deberían implementar políticas más restrictivas