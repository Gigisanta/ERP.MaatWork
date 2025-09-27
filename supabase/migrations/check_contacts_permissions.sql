-- Verificar permisos actuales para la tabla contacts
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'contacts' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos completos a usuarios autenticados
GRANT ALL PRIVILEGES ON contacts TO authenticated;

-- Otorgar permisos de lectura a usuarios anónimos (opcional)
GRANT SELECT ON contacts TO anon;

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'contacts';

-- Crear política RLS para usuarios autenticados si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' 
        AND policyname = 'Users can manage their own contacts'
    ) THEN
        CREATE POLICY "Users can manage their own contacts" ON contacts
        FOR ALL USING (assigned_to = auth.uid()::text)
        WITH CHECK (assigned_to = auth.uid()::text);
    END IF;
END
$$;