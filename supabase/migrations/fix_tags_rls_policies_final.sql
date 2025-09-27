-- Verificar y corregir políticas RLS para la tabla tags
-- Esta migración asegura que las políticas RLS permitan operaciones CRUD correctamente

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "tags_select_authenticated" ON tags;
DROP POLICY IF EXISTS "tags_insert_authenticated" ON tags;
DROP POLICY IF EXISTS "tags_update_authenticated" ON tags;
DROP POLICY IF EXISTS "tags_delete_authenticated" ON tags;

-- Asegurar que RLS esté habilitado
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para usuarios autenticados
-- Política SELECT: permitir a usuarios autenticados ver todas las etiquetas
CREATE POLICY "tags_select_authenticated" ON tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Política INSERT: permitir a usuarios autenticados crear etiquetas
-- La etiqueta debe ser creada por el usuario autenticado
CREATE POLICY "tags_insert_authenticated" ON tags
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política UPDATE: permitir a usuarios autenticados actualizar etiquetas que crearon
CREATE POLICY "tags_update_authenticated" ON tags
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid() OR auth.uid() IS NOT NULL)
    WITH CHECK (created_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Política DELETE: permitir a usuarios autenticados eliminar etiquetas que crearon
CREATE POLICY "tags_delete_authenticated" ON tags
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Otorgar permisos explícitos a los roles
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT ON tags TO anon;

-- Verificar que las políticas se crearon correctamente
DO $$
BEGIN
    -- Verificar políticas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tags' 
        AND policyname = 'tags_select_authenticated'
    ) THEN
        RAISE EXCEPTION 'Error: Política tags_select_authenticated no se creó correctamente';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tags' 
        AND policyname = 'tags_insert_authenticated'
    ) THEN
        RAISE EXCEPTION 'Error: Política tags_insert_authenticated no se creó correctamente';
    END IF;
    
    RAISE NOTICE 'Políticas RLS para tags creadas exitosamente';
END $$;

-- Mostrar información de las políticas creadas
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
WHERE tablename = 'tags'
ORDER BY policyname;