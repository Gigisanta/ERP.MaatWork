-- Migración crítica para corregir políticas RLS de seguridad
-- Fecha: 2025-01-18
-- Problema: Tablas críticas permiten acceso anónimo

-- Revocar permisos anónimos de todas las tablas críticas
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.teams FROM anon;
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.tasks FROM anon;
REVOKE ALL ON public.invitations FROM anon;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.contacts FROM anon;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas permisivas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.users;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.teams;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.teams;
DROP POLICY IF EXISTS "Enable update for team members" ON public.teams;
DROP POLICY IF EXISTS "Enable delete for team owners" ON public.teams;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for task assignees" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for task creators" ON public.tasks;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for notification owners" ON public.notifications;
DROP POLICY IF EXISTS "Enable delete for notification owners" ON public.notifications;

-- Crear políticas RLS seguras para USERS
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid()::text = id::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            auth.uid()::text = id::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
        )
    );

CREATE POLICY "users_delete_policy" ON public.users
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- Crear políticas RLS seguras para TEAMS
CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id::text = auth.uid()::text) OR
            auth.uid()::text = manager_id::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "teams_insert_policy" ON public.teams
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
    );

CREATE POLICY "teams_update_policy" ON public.teams
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            auth.uid()::text = manager_id::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "teams_delete_policy" ON public.teams
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- Crear políticas RLS seguras para TASKS
CREATE POLICY "tasks_select_policy" ON public.tasks
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            created_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.task_assignments WHERE task_id = tasks.id AND assigned_to::text = auth.uid()::text) OR
            EXISTS (SELECT 1 FROM public.team_members WHERE team_id = tasks.team_id AND user_id::text = auth.uid()::text) OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "tasks_insert_policy" ON public.tasks
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            created_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.team_members WHERE team_id = tasks.team_id AND user_id::text = auth.uid()::text) OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "tasks_update_policy" ON public.tasks
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            created_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.task_assignments WHERE task_id = tasks.id AND assigned_to::text = auth.uid()::text) OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
        )
    );

CREATE POLICY "tasks_delete_policy" ON public.tasks
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            created_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
        )
    );

-- Conceder permisos mínimos necesarios
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.tasks TO authenticated;
GRANT SELECT ON public.invitations TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.contacts TO authenticated;

-- Crear índices para optimizar las consultas de políticas RLS
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON public.task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON public.teams(manager_id);

-- 9. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON POLICY "users_select_policy" ON public.users IS 'Permite a los usuarios ver solo su propio perfil y a los admins ver todos';
COMMENT ON POLICY "teams_select_policy" ON public.teams IS 'Permite ver equipos solo a miembros del equipo y administradores';
COMMENT ON POLICY "tasks_select_policy" ON public.tasks IS 'Permite ver tareas solo a usuarios asignados, creadores y miembros del equipo';

-- Migración aplicada: fix_critical_rls_security
-- Descripción: Corrección crítica de seguridad RLS - eliminación de acceso anónimo y implementación de políticas seguras
-- Fecha: $(date)