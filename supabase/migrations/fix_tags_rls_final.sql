-- Solución definitiva para políticas RLS de la tabla tags
-- Corrige el error: "new row violates row-level security policy for table tags"

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "tags_select_policy" ON public.tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON public.tags;
DROP POLICY IF EXISTS "tags_update_policy" ON public.tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON public.tags;
DROP POLICY IF EXISTS "Users can view all tags" ON public.tags;
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their tags" ON public.tags;

-- Asegurar que RLS esté habilitado
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS permisivas para usuarios autenticados
-- Política SELECT: permite ver todas las etiquetas
CREATE POLICY "tags_select_authenticated" ON public.tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Política INSERT: permite crear etiquetas a usuarios autenticados
CREATE POLICY "tags_insert_authenticated" ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política UPDATE: permite actualizar etiquetas a usuarios autenticados
CREATE POLICY "tags_update_authenticated" ON public.tags
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política DELETE: permite eliminar etiquetas a usuarios autenticados
CREATE POLICY "tags_delete_authenticated" ON public.tags
    FOR DELETE
    TO authenticated
    USING (true);

-- Otorgar permisos explícitos a los roles
GRANT ALL PRIVILEGES ON public.tags TO authenticated;
GRANT SELECT ON public.tags TO anon;

-- Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'tags'
ORDER BY policyname;