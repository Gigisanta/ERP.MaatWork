-- Migración para corregir políticas RLS
-- Fecha: 2024-01-15
-- Descripción: Establece políticas RLS básicas y funcionales para todas las tablas

-- Habilitar RLS en tablas que no lo tienen pero deberían tenerlo
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan estar causando problemas
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Contacts isolation policy" ON contacts;
DROP POLICY IF EXISTS "Contact status history isolation" ON contact_status_history;
DROP POLICY IF EXISTS "Monthly conversion metrics isolation" ON monthly_conversion_metrics;
DROP POLICY IF EXISTS "Historical metrics isolation" ON historical_metrics;
DROP POLICY IF EXISTS "User metrics isolation" ON user_metrics;
DROP POLICY IF EXISTS "Team settings isolation" ON team_settings;
DROP POLICY IF EXISTS "Approvals isolation" ON approvals;
DROP POLICY IF EXISTS "Task annotations isolation" ON task_annotations;
DROP POLICY IF EXISTS "Notifications isolation" ON notifications;
DROP POLICY IF EXISTS "Notes isolation" ON notes;
DROP POLICY IF EXISTS "Note attachments isolation" ON note_attachments;
DROP POLICY IF EXISTS "Note tags isolation" ON note_tags;
DROP POLICY IF EXISTS "Contact tags isolation" ON contact_tags;
DROP POLICY IF EXISTS "Tags isolation" ON tags;
DROP POLICY IF EXISTS "Metric alerts isolation" ON metric_alerts;

-- Crear políticas RLS simples y funcionales

-- Política para usuarios: pueden ver y actualizar su propio perfil
CREATE POLICY "users_policy" ON users
    FOR ALL
    USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Política para contactos: aislamiento por user_id
CREATE POLICY "contacts_policy" ON contacts
    FOR ALL
    USING (
        auth.uid()::text = user_id::text OR 
        auth.role() = 'service_role' OR
        user_id IS NULL
    );

-- Política para historial de estado de contactos
CREATE POLICY "contact_status_history_policy" ON contact_status_history
    FOR ALL
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_status_history.contact_id 
            AND (contacts.user_id::text = auth.uid()::text OR contacts.user_id IS NULL)
        )
    );

-- Política para métricas mensuales de conversión
CREATE POLICY "monthly_conversion_metrics_policy" ON monthly_conversion_metrics
    FOR ALL
    USING (
        auth.uid()::text = user_id OR 
        auth.role() = 'service_role' OR
        user_id IS NULL
    );

-- Política para métricas históricas
CREATE POLICY "historical_metrics_policy" ON historical_metrics
    FOR ALL
    USING (
        auth.uid()::text = user_id OR 
        auth.role() = 'service_role' OR
        user_id IS NULL
    );

-- Política para métricas de usuario
CREATE POLICY "user_metrics_policy" ON user_metrics
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Política para configuraciones de equipo
CREATE POLICY "team_settings_policy" ON team_settings
    FOR ALL
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = team_settings.team_id 
            AND team_members.user_id = auth.uid()
        )
    );

-- Política para aprobaciones
CREATE POLICY "approvals_policy" ON approvals
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.uid() = approved_by OR
        auth.uid() = reviewed_by OR
        auth.role() = 'service_role'
    );

-- Política para anotaciones de tareas
CREATE POLICY "task_annotations_policy" ON task_annotations
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Política para notificaciones
CREATE POLICY "notifications_policy" ON notifications
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Política para notas
CREATE POLICY "notes_policy" ON notes
    FOR ALL
    USING (
        auth.uid() = author_id OR 
        auth.role() = 'service_role'
    );

-- Política para adjuntos de notas
CREATE POLICY "note_attachments_policy" ON note_attachments
    FOR ALL
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = note_attachments.note_id 
            AND notes.author_id = auth.uid()
        )
    );

-- Política para etiquetas de notas
CREATE POLICY "note_tags_policy" ON note_tags
    FOR ALL
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = note_tags.note_id 
            AND notes.author_id = auth.uid()
        )
    );

-- Política para etiquetas de contactos
CREATE POLICY "contact_tags_policy" ON contact_tags
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Política para etiquetas del sistema
CREATE POLICY "tags_policy" ON tags
    FOR ALL
    USING (
        auth.uid() = created_by OR 
        auth.role() = 'service_role' OR
        created_by IS NULL
    );

-- Política para alertas de métricas
CREATE POLICY "metric_alerts_policy" ON metric_alerts
    FOR ALL
    USING (
        auth.uid()::text = user_id OR 
        auth.role() = 'service_role'
    );

-- Política para equipos
CREATE POLICY "teams_policy" ON teams
    FOR ALL
    USING (
        auth.uid() = manager_id OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid()
        )
    );

-- Política para miembros de equipo
CREATE POLICY "team_members_policy" ON team_members
    FOR ALL
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_members.team_id 
            AND teams.manager_id = auth.uid()
        )
    );

-- Política para invitaciones
CREATE POLICY "invitations_policy" ON invitations
    FOR ALL
    USING (
        auth.uid() = invited_by OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = invitations.team_id 
            AND teams.manager_id = auth.uid()
        )
    );

-- Política para tareas
CREATE POLICY "tasks_policy" ON tasks
    FOR ALL
    USING (
        auth.uid() = created_by OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM task_assignments 
            WHERE task_assignments.task_id = tasks.id 
            AND task_assignments.assigned_to = auth.uid()
        )
    );

-- Política para asignaciones de tareas
CREATE POLICY "task_assignments_policy" ON task_assignments
    FOR ALL
    USING (
        auth.uid() = assigned_to OR 
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_assignments.task_id 
            AND tasks.created_by = auth.uid()
        )
    );

-- Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT ON users TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT ON contacts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_status_history TO authenticated;
GRANT SELECT ON contact_status_history TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_conversion_metrics TO authenticated;
GRANT SELECT ON monthly_conversion_metrics TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON historical_metrics TO authenticated;
GRANT SELECT ON historical_metrics TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_metrics TO authenticated;
GRANT SELECT ON user_metrics TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON team_settings TO authenticated;
GRANT SELECT ON team_settings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON approvals TO authenticated;
GRANT SELECT ON approvals TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON task_annotations TO authenticated;
GRANT SELECT ON task_annotations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT SELECT ON notes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON note_attachments TO authenticated;
GRANT SELECT ON note_attachments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON note_tags TO authenticated;
GRANT SELECT ON note_tags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_tags TO authenticated;
GRANT SELECT ON contact_tags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT ON tags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON metric_alerts TO authenticated;
GRANT SELECT ON metric_alerts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON teams TO authenticated;
GRANT SELECT ON teams TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON team_members TO authenticated;
GRANT SELECT ON team_members TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT ON invitations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT ON tasks TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignments TO authenticated;
GRANT SELECT ON task_assignments TO anon;

-- Comentario final
-- Esta migración establece políticas RLS básicas pero funcionales
-- que permiten el aislamiento de datos por usuario mientras mantienen
-- la funcionalidad del sistema.