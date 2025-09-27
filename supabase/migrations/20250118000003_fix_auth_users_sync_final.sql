-- Migración crítica final para reparar error de creación de contactos
-- Fecha: 2025-01-18
-- Problema: Desincronización entre auth.users y public.users
-- Solución: Sincronización segura sin conflictos

-- 1. ANÁLISIS Y LIMPIEZA INICIAL
-- Primero, verificar y limpiar datos inconsistentes

-- Eliminar contactos huérfanos (sin usuario válido)
DELETE FROM public.contacts 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

-- 2. MODIFICAR ESTRUCTURA DE USERS PARA SINCRONIZACIÓN
-- Eliminar la constraint de FK existente si existe
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Agregar constraint FK hacia auth.users
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. FUNCIÓN DE SINCRONIZACIÓN MEJORADA
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Extraer nombre del metadata o usar parte del email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
    );
    
    -- Insertar o actualizar usuario en public.users
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
    VALUES (
        NEW.id, 
        NEW.email, 
        user_name,
        user_name,
        'advisor',
        NEW.created_at,
        NOW(),
        false,
        'pending',
        false,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        name = COALESCE(EXCLUDED.name, users.name),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER PARA SINCRONIZACIÓN AUTOMÁTICA
DROP TRIGGER IF EXISTS sync_user_trigger ON auth.users;

CREATE TRIGGER sync_user_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_public();

-- 5. SINCRONIZACIÓN MANUAL DE USUARIOS EXISTENTES
-- Sincronizar usuarios de auth que no están en public
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
    false as is_approved,
    'active' as status,
    false as approved,
    true as active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. ACTUALIZAR USUARIOS EXISTENTES CON EMAILS DIFERENTES
-- Solo actualizar si el email en auth es diferente al de public
UPDATE public.users 
SET 
    email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE public.users.id = au.id 
AND public.users.email != au.email;

-- 7. POLÍTICAS RLS SIMPLIFICADAS
-- Eliminar todas las políticas existentes de users
DROP POLICY IF EXISTS "users_own_data" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "admins_can_manage_users" ON public.users;

-- Crear política simple para users
CREATE POLICY "users_authenticated_access" ON public.users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Eliminar todas las políticas existentes de contacts
DROP POLICY IF EXISTS "contacts_own_data" ON public.contacts;
DROP POLICY IF EXISTS "admin_contacts_access" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON public.contacts;
DROP POLICY IF EXISTS "users_can_manage_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admins_can_manage_all_contacts" ON public.contacts;

-- Crear política simple para contacts
CREATE POLICY "contacts_user_access" ON public.contacts
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR 
            user_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role IN ('admin', 'manager')
            )
        )
    );

-- 8. PERMISOS BÁSICOS
-- Revocar todos los permisos anónimos
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.contacts FROM anon;

-- Otorgar permisos completos a usuarios autenticados
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.contacts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_auth ON public.contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_auth ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_auth ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_contacts_status_auth ON public.contacts(status);

-- 10. FUNCIÓN DE VALIDACIÓN FINAL
CREATE OR REPLACE FUNCTION validate_contacts_repair()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count_value BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Usuarios en auth vs public
    RETURN QUERY
    SELECT 
        'auth_vs_public_users'::TEXT,
        CASE WHEN auth_count = public_count THEN 'OK' ELSE 'WARNING' END::TEXT,
        auth_count,
        ('Auth: ' || auth_count || ', Public: ' || public_count)::TEXT
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM auth.users) as auth_count,
            (SELECT COUNT(*) FROM public.users) as public_count
    ) counts;
    
    -- Check 2: Contactos huérfanos
    RETURN QUERY
    SELECT 
        'orphaned_contacts'::TEXT,
        CASE WHEN orphaned_count = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        orphaned_count,
        ('Contactos sin usuario válido: ' || orphaned_count)::TEXT
    FROM (
        SELECT COUNT(*) as orphaned_count
        FROM public.contacts c
        LEFT JOIN public.users u ON c.user_id = u.id
        WHERE c.user_id IS NOT NULL AND u.id IS NULL
    ) orphaned;
    
    -- Check 3: Total de contactos
    RETURN QUERY
    SELECT 
        'total_contacts'::TEXT,
        'INFO'::TEXT,
        total_contacts,
        ('Total de contactos en sistema: ' || total_contacts)::TEXT
    FROM (
        SELECT COUNT(*) as total_contacts FROM public.contacts
    ) total;
    
    -- Check 4: Políticas RLS activas
    RETURN QUERY
    SELECT 
        'rls_policies'::TEXT,
        'INFO'::TEXT,
        policy_count,
        ('Políticas RLS activas: ' || policy_count)::TEXT
    FROM (
        SELECT COUNT(*) as policy_count 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'contacts')
    ) policies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. EJECUTAR VALIDACIÓN
SELECT * FROM validate_contacts_repair();

-- Migración completada: fix_auth_users_sync_final
-- Descripción: Reparación final del error de creación de contactos
-- Fecha: 2025-01-18
-- Estado: Listo para producción