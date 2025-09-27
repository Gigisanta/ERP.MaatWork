-- Migración crítica para reparar error de creación de contactos (versión simplificada)
-- Fecha: 2025-01-18
-- Problema: user_id en contacts no existe en public.users (violación FK)
-- Solución: Sincronización simple y segura auth.users <-> public.users

-- 1. VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA USERS
-- Asegurar que la tabla users existe con la estructura correcta
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice único en email si no existe
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users(email);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. VERIFICAR Y CORREGIR TABLA CONTACTS
-- Recrear foreign key constraint si es necesario
ALTER TABLE public.contacts 
DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;

ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Índices para performance en contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);

-- 3. FUNCIÓN DE SINCRONIZACIÓN AUTOMÁTICA SIMPLIFICADA
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar o actualizar usuario en public.users
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        name = COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER PARA EJECUTAR LA FUNCIÓN
-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS sync_user_trigger ON auth.users;

-- Crear nuevo trigger
CREATE TRIGGER sync_user_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_public();

-- 5. MIGRACIÓN SEGURA DE DATOS EXISTENTES
-- Primero, limpiar duplicados por email manteniendo el más reciente
DELETE FROM public.users 
WHERE id IN (
    SELECT u1.id
    FROM public.users u1
    INNER JOIN public.users u2 ON u1.email = u2.email
    WHERE u1.id != u2.id AND u1.created_at < u2.created_at
);

-- Sincronizar usuarios existentes de auth a public
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

-- 6. POLÍTICAS RLS PARA USERS
-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
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

-- Crear políticas simples y seguras
CREATE POLICY "users_own_data" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin_full_access" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. POLÍTICAS RLS PARA CONTACTS
-- Habilitar RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON public.contacts;
DROP POLICY IF EXISTS "users_can_manage_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admins_can_manage_all_contacts" ON public.contacts;

-- Crear políticas simples para contacts
CREATE POLICY "contacts_own_data" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_contacts_access" ON public.contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. PERMISOS BÁSICOS
-- Revocar permisos anónimos
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.contacts FROM anon;

-- Otorgar permisos a usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. FUNCIÓN DE VALIDACIÓN SIMPLIFICADA
CREATE OR REPLACE FUNCTION check_user_sync_status()
RETURNS TABLE(
    metric TEXT,
    count_value BIGINT
) AS $$
BEGIN
    -- Usuarios en auth
    RETURN QUERY
    SELECT 'auth_users'::TEXT, COUNT(*) FROM auth.users;
    
    -- Usuarios en public
    RETURN QUERY
    SELECT 'public_users'::TEXT, COUNT(*) FROM public.users;
    
    -- Usuarios no sincronizados
    RETURN QUERY
    SELECT 'unsynced_users'::TEXT, COUNT(*)
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;
    
    -- Contactos totales
    RETURN QUERY
    SELECT 'total_contacts'::TEXT, COUNT(*) FROM public.contacts;
    
    -- Contactos huérfanos
    RETURN QUERY
    SELECT 'orphaned_contacts'::TEXT, COUNT(*)
    FROM public.contacts c
    LEFT JOIN public.users u ON c.user_id = u.id
    WHERE u.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. EJECUTAR VALIDACIÓN
SELECT * FROM check_user_sync_status();

-- Migración completada: fix_contacts_user_sync_simple
-- Descripción: Reparación crítica simplificada del error de creación de contactos
-- Fecha: 2025-01-18