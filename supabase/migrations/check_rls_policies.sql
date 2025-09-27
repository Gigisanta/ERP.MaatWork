-- Verificar políticas RLS en tablas principales
-- Este archivo verifica que las políticas de seguridad estén configuradas correctamente

-- Verificar RLS habilitado en tablas principales
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('contacts', 'notes', 'tasks', 'teams', 'users', 'notifications')
ORDER BY tablename;

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('contacts', 'notes', 'tasks', 'teams', 'users', 'notifications')
ORDER BY tablename, policyname;

-- Verificar permisos de roles
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated')
AND table_name IN ('contacts', 'notes', 'tasks', 'teams', 'users', 'notifications')
ORDER BY table_name, grantee;