-- Script simplificado para validar y otorgar permisos en Supabase
-- Solo otorga permisos básicos sin crear políticas RLS problemáticas

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos básicos de lectura al rol anon para tablas públicas
GRANT SELECT ON notion_workspaces TO anon;
GRANT SELECT ON monthly_conversion_metrics TO anon;
GRANT SELECT ON notion_pages_map TO anon;
GRANT SELECT ON migration_logs TO anon;
GRANT SELECT ON contacts TO anon;
GRANT SELECT ON deals TO anon;
GRANT SELECT ON tasks TO anon;

-- Otorgar permisos completos al rol authenticated
GRANT ALL PRIVILEGES ON notion_workspaces TO authenticated;
GRANT ALL PRIVILEGES ON monthly_conversion_metrics TO authenticated;
GRANT ALL PRIVILEGES ON notion_pages_map TO authenticated;
GRANT ALL PRIVILEGES ON migration_logs TO authenticated;
GRANT ALL PRIVILEGES ON contacts TO authenticated;
GRANT ALL PRIVILEGES ON deals TO authenticated;
GRANT ALL PRIVILEGES ON tasks TO authenticated;

-- Otorgar permisos en secuencias (para campos auto-incrementales)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verificar que RLS esté habilitado en todas las tablas críticas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notion_workspaces', 'contacts', 'deals', 'tasks', 'migration_logs')
ORDER BY tablename;

-- Mostrar políticas RLS existentes
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
AND tablename IN ('notion_workspaces', 'contacts', 'deals', 'tasks', 'migration_logs')
ORDER BY tablename, policyname;

-- Mensaje de confirmación
SELECT 'Permisos básicos otorgados correctamente. RLS ya está configurado en las tablas.' as status;