-- Verificar y configurar políticas RLS finales
-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "usuarios_pueden_insertar" ON public.users;
DROP POLICY IF EXISTS "usuarios_pueden_leer" ON public.users;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar" ON public.users;
DROP POLICY IF EXISTS "approvals_pueden_insertar" ON public.approvals;
DROP POLICY IF EXISTS "approvals_pueden_leer" ON public.approvals;
DROP POLICY IF EXISTS "approvals_pueden_actualizar" ON public.approvals;

-- Crear políticas simples y permisivas para usuarios autenticados
CREATE POLICY "permitir_insertar_usuarios" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "permitir_leer_usuarios" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "permitir_actualizar_usuarios" ON public.users
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para la tabla approvals
CREATE POLICY "permitir_insertar_approvals" ON public.approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "permitir_leer_approvals" ON public.approvals
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "permitir_actualizar_approvals" ON public.approvals
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Asegurar que RLS está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos explícitos
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.approvals TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verificar configuración
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'approvals')
ORDER BY tablename, policyname;