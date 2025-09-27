-- Migración para corregir políticas RLS y permisos de la tabla contacts en producción
-- Fecha: 2025-01-18

-- 1. Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contacts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contacts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contacts;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS seguras y funcionales

-- Política de SELECT: Los usuarios pueden ver sus propios contactos
CREATE POLICY "contacts_select_own" ON contacts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política de INSERT: Los usuarios autenticados pueden crear contactos
CREATE POLICY "contacts_insert_authenticated" ON contacts
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Política de UPDATE: Los usuarios pueden actualizar sus propios contactos
CREATE POLICY "contacts_update_own" ON contacts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Los usuarios pueden eliminar sus propios contactos
CREATE POLICY "contacts_delete_own" ON contacts
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Otorgar permisos necesarios a los roles

-- Permisos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;

-- Permisos mínimos para usuarios anónimos (solo lectura si es necesario)
-- GRANT SELECT ON contacts TO anon; -- Comentado por seguridad

-- 5. Crear índices para optimizar las consultas con RLS
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- 6. Verificar que las políticas se aplicaron correctamente
DO $$
BEGIN
    -- Verificar que RLS está habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'contacts' 
        AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS no está habilitado en la tabla contacts';
    END IF;
    
    -- Verificar que las políticas existen
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' 
        AND policyname = 'contacts_select_own'
    ) THEN
        RAISE EXCEPTION 'Política contacts_select_own no fue creada';
    END IF;
    
    RAISE NOTICE 'Políticas RLS aplicadas correctamente para la tabla contacts';
END $$;

-- 7. Comentarios de documentación
COMMENT ON TABLE contacts IS 'Tabla de contactos con RLS habilitado - cada usuario solo puede acceder a sus propios contactos';
COMMENT ON POLICY "contacts_select_own" ON contacts IS 'Permite a los usuarios ver solo sus propios contactos';
COMMENT ON POLICY "contacts_insert_authenticated" ON contacts IS 'Permite a usuarios autenticados crear contactos asignados a ellos';
COMMENT ON POLICY "contacts_update_own" ON contacts IS 'Permite a los usuarios actualizar solo sus propios contactos';
COMMENT ON POLICY "contacts_delete_own" ON contacts IS 'Permite a los usuarios eliminar solo sus propios contactos';