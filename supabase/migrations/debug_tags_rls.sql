-- Verificar estado de la tabla tags y políticas RLS
-- Diagnóstico completo para resolver errores de creación de etiquetas

-- 1. Verificar si la tabla tags existe
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tags';

-- 2. Verificar políticas RLS activas en la tabla tags
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

-- 3. Verificar permisos de tabla para roles
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'tags' 
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 4. Verificar estructura de la tabla tags
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tags'
ORDER BY ordinal_position;

-- 5. Contar registros existentes en tags
SELECT COUNT(*) as total_tags FROM public.tags;

-- 6. Verificar usuario actual autenticado
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 7. Verificar si el usuario actual puede insertar en tags (test)
-- Esta consulta simulará la inserción sin ejecutarla
EXPLAIN (FORMAT JSON) 
INSERT INTO public.tags (name, color, backgroundColor, created_by) 
VALUES ('test-tag', '#3B82F6', '#EFF6FF', auth.uid());