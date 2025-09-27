-- Verificar usuarios existentes y crear usuario de prueba si es necesario

-- 1. Verificar usuarios existentes en auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar usuarios en tabla public.users
SELECT 
    id,
    full_name,
    email,
    role,
    is_approved,
    created_at,
    updated_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar si existe el usuario gio@test.com
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    pu.full_name,
    pu.role,
    pu.is_approved
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'gio@test.com';

-- 4. Si no existe, crear usuario de prueba (comentado para evitar errores)
/*
-- Insertar en auth.users (esto normalmente se hace a través de la API de Supabase)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Test User", "username": "testuser", "role": "advisor"}'
);
*/

-- 5. Verificar configuración de RLS en tabla tags
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tags' AND schemaname = 'public';

-- 6. Verificar políticas RLS activas
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

-- 7. Verificar permisos de roles
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'tags' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;