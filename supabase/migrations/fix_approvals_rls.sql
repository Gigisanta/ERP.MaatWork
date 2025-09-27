-- Migración: Corregir políticas RLS para tabla approvals
-- Fecha: $(date)
-- Descripción: Eliminar acceso anónimo a la tabla approvals y aplicar políticas seguras

-- 1. REVOCAR PERMISOS ANÓNIMOS
REVOKE ALL ON public.approvals FROM anon;

-- 2. HABILITAR RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS EXISTENTES PERMISIVAS
DROP POLICY IF EXISTS "approvals_select_policy" ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert_policy" ON public.approvals;
DROP POLICY IF EXISTS "approvals_update_policy" ON public.approvals;
DROP POLICY IF EXISTS "approvals_delete_policy" ON public.approvals;

-- 4. CREAR POLÍTICAS SEGURAS PARA APPROVALS

-- Política de SELECT: Solo el usuario puede ver sus propias aprobaciones y los admins pueden ver todas
CREATE POLICY "approvals_select_policy" ON public.approvals
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            user_id::text = auth.uid()::text OR
            approved_by::text = auth.uid()::text OR
            reviewed_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
        )
    );

-- Política de INSERT: Solo usuarios autenticados pueden crear aprobaciones
CREATE POLICY "approvals_insert_policy" ON public.approvals
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id::text = auth.uid()::text
    );

-- Política de UPDATE: Solo admins y el usuario que aprueba pueden actualizar
CREATE POLICY "approvals_update_policy" ON public.approvals
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            approved_by::text = auth.uid()::text OR
            reviewed_by::text = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
        )
    );

-- Política de DELETE: Solo admins pueden eliminar aprobaciones
CREATE POLICY "approvals_delete_policy" ON public.approvals
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- 5. CONCEDER PERMISOS MÍNIMOS A USUARIOS AUTENTICADOS
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;

-- 6. CREAR ÍNDICES PARA OPTIMIZAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_approvals_user_id ON public.approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approved_by ON public.approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewed_by ON public.approvals(reviewed_by);

-- 7. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON POLICY "approvals_select_policy" ON public.approvals IS 'Permite ver aprobaciones solo al usuario involucrado y administradores';
COMMENT ON POLICY "approvals_insert_policy" ON public.approvals IS 'Solo usuarios autenticados pueden crear aprobaciones';
COMMENT ON POLICY "approvals_update_policy" ON public.approvals IS 'Solo quien aprueba y administradores pueden actualizar';
COMMENT ON POLICY "approvals_delete_policy" ON public.approvals IS 'Solo administradores pueden eliminar aprobaciones';

-- Migración completada: fix_approvals_rls
-- Descripción: Tabla approvals ahora tiene políticas RLS seguras sin acceso anónimo