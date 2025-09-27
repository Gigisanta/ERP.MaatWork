-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "tags_select_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
DROP POLICY IF EXISTS "tags_update_policy" ON tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON tags;

-- Asegurar que RLS esté habilitado
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS más permisivas para usuarios autenticados
CREATE POLICY "tags_select_policy" ON tags
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "tags_insert_policy" ON tags
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tags_update_policy" ON tags
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "tags_delete_policy" ON tags
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- Otorgar permisos a los roles
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT ON tags TO anon;

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tags';