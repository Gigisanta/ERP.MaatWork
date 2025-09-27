-- Migración simplificada para sincronización de usuarios
-- Fecha: 2025-01-18
-- Problema: Sintaxis SQL compleja causando errores
-- Solución: Enfoque simple y directo

-- 1. LIMPIEZA DE DATOS INCONSISTENTES
-- Eliminar contactos que referencian usuarios inexistentes
DELETE FROM public.contacts 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Eliminar usuarios en public que no existen en auth
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. SINCRONIZAR USUARIOS FALTANTES (MÉTODO SIMPLE)
-- Insertar usuarios de auth que no están en public
INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    name,
    role,
    created_at, 
    updated_at,
    is_approved,
    status,
    approved,
    active
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'full_name', 
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'full_name', 
        split_part(au.email, '@', 1)
    ) as name,
    'advisor' as role,
    au.created_at,
    NOW() as updated_at,
    true as is_approved,
    'active' as status,
    true as approved,
    true as active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 3. FUNCIÓN DE SINCRONIZACIÓN SIMPLE
CREATE OR REPLACE FUNCTION sync_auth_user_simple()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    existing_user_id UUID;
BEGIN
    -- Extraer nombre del metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
    );
    
    -- Verificar si el usuario ya existe por ID
    SELECT id INTO existing_user_id FROM public.users WHERE id = NEW.id;
    
    IF existing_user_id IS NOT NULL THEN
        -- Actualizar usuario existente
        UPDATE public.users SET
            email = NEW.email,
            full_name = COALESCE(user_name, full_name),
            name = COALESCE(user_name, name),
            updated_at = NOW()
        WHERE id = NEW.id;
    ELSE
        -- Insertar nuevo usuario
        INSERT INTO public.users (
            id, email, full_name, name, role, 
            created_at, updated_at, is_approved, 
            status, approved, active
        ) VALUES (
            NEW.id, NEW.email, user_name, user_name, 'advisor',
            NEW.created_at, NOW(), true, 'active', true, true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER PARA SINCRONIZACIÓN
DROP TRIGGER IF EXISTS sync_user_simple_trigger ON auth.users;

CREATE TRIGGER sync_user_simple_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_auth_user_simple();

-- 5. POLÍTICAS RLS PERMISIVAS
-- Eliminar todas las políticas existentes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Eliminar políticas de users
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.users';
    END LOOP;
    
    -- Eliminar políticas de contacts
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'contacts'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.contacts';
    END LOOP;
END $$;

-- Crear políticas simples
CREATE POLICY "users_authenticated" ON public.users
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "contacts_authenticated" ON public.contacts
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. PERMISOS
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.contacts FROM anon;

GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.contacts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. FUNCIÓN DE VALIDACIÓN
CREATE OR REPLACE FUNCTION check_sync_status()
RETURNS TABLE(
    item TEXT,
    count_val BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'auth_users'::TEXT, COUNT(*)::BIGINT, 'INFO'::TEXT FROM auth.users;
    
    RETURN QUERY
    SELECT 'public_users'::TEXT, COUNT(*)::BIGINT, 'INFO'::TEXT FROM public.users;
    
    RETURN QUERY
    SELECT 'total_contacts'::TEXT, COUNT(*)::BIGINT, 'INFO'::TEXT FROM public.contacts;
    
    RETURN QUERY
    SELECT 
        'orphaned_contacts'::TEXT, 
        COUNT(*)::BIGINT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT
    FROM public.contacts c
    LEFT JOIN public.users u ON c.user_id = u.id
    WHERE c.user_id IS NOT NULL AND u.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. EJECUTAR VALIDACIÓN
SELECT * FROM check_sync_status();

-- Migración completada: simple_user_sync
-- Descripción: Sincronización simple y funcional de usuarios
-- Fecha: 2025-01-18