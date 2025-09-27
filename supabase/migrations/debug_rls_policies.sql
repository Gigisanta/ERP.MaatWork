-- Debug RLS Policies para tabla tags
-- Este archivo ayuda a diagnosticar problemas de RLS

-- 1. Verificar políticas RLS activas en la tabla tags
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
WHERE tablename = 'tags' AND schemaname = 'public';

-- 2. Verificar estado de RLS en la tabla
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tags' AND schemaname = 'public';

-- 3. Verificar permisos de roles en la tabla tags
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- 4. Test de autenticación actual
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    current_user as postgres_user;

-- 5. Intentar insertar una etiqueta de prueba (comentado para evitar errores)
/*
INSERT INTO tags (name, color, backgroundcolor, created_by) 
VALUES ('test_debug', '#FF0000', '#FFE5E5', auth.uid());
*/

-- 6. Verificar datos existentes en tags
SELECT id, name, created_by, created_at FROM tags LIMIT 5;