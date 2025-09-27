-- Arreglar recursión infinita en políticas RLS de la tabla users
-- Eliminar TODAS las políticas existentes que pueden causar recursión

DO $$ 
BEGIN
    -- Eliminar todas las políticas existentes de users
    DROP POLICY IF EXISTS "Permitir inserción de perfiles durante registro" ON public.users;
    DROP POLICY IF EXISTS "Usuarios pueden insertar perfiles con su propio ID" ON public.users;
    DROP POLICY IF EXISTS "Sistema puede crear perfiles" ON public.users;
    DROP POLICY IF EXISTS "Usuarios pueden ver sus propios perfiles" ON public.users;
    DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios perfiles" ON public.users;
    DROP POLICY IF EXISTS "usuarios_pueden_insertar" ON public.users;
    DROP POLICY IF EXISTS "usuarios_pueden_leer" ON public.users;
    DROP POLICY IF EXISTS "usuarios_pueden_actualizar" ON public.users;
    DROP POLICY IF EXISTS "permitir_insertar_usuarios" ON public.users;
    DROP POLICY IF EXISTS "permitir_leer_usuarios" ON public.users;
    DROP POLICY IF EXISTS "permitir_actualizar_usuarios" ON public.users;
    DROP POLICY IF EXISTS "usuarios_pueden_actualizar_propios" ON public.users;
    DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios perfiles" ON public.users;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar errores si las políticas no existen
        NULL;
END $$;

-- Revocar todos los permisos existentes primero
REVOKE ALL ON public.users FROM authenticated, anon;

-- Crear políticas simples y sin recursión
-- Política para inserción: permitir a usuarios autenticados insertar con su propio ID
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = id::text);

-- Política para lectura: permitir a usuarios autenticados leer sus propios datos
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Política para actualización: permitir a usuarios autenticados actualizar sus propios datos
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Otorgar permisos básicos necesarios
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Verificar que RLS esté habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Mostrar las políticas creadas para verificación
SELECT 
    'POLÍTICAS CREADAS' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;