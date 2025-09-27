-- Migración para corregir políticas RLS de usuarios
-- Permite que usuarios autenticados vean otros usuarios (necesario para foreign keys)

-- Eliminar políticas restrictivas existentes que impiden ver otros usuarios
DROP POLICY IF EXISTS "usuarios_pueden_ver_propios" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "permitir_leer_usuarios" ON public.users;

-- Crear política que permita a usuarios autenticados ver todos los usuarios
-- Esto es necesario para que las foreign keys funcionen correctamente
CREATE POLICY "authenticated_users_can_view_all_users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Asegurar que existe política de inserción (solo su propio perfil)
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;
CREATE POLICY "users_can_insert_own_profile" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = id::text);

-- Asegurar que existe política de actualización (solo su propio perfil)
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
CREATE POLICY "users_can_update_own_profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Comentario de la migración
COMMENT ON TABLE public.users IS 'Tabla de usuarios con políticas RLS que permiten SELECT a todos los usuarios autenticados';