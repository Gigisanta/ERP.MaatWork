-- Consulta para verificar datos en las tablas
-- Verificar usuarios registrados
SELECT 
  'USUARIOS REGISTRADOS' as tabla,
  COUNT(*) as total_registros
FROM public.users;

-- Mostrar últimos usuarios registrados
SELECT 
  'ÚLTIMOS USUARIOS' as info,
  id,
  email,
  full_name,
  role,
  is_approved,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar solicitudes de aprobación
SELECT 
  'SOLICITUDES DE APROBACIÓN' as tabla,
  COUNT(*) as total_solicitudes
FROM public.approvals;

-- Mostrar últimas solicitudes
SELECT 
  'ÚLTIMAS SOLICITUDES' as info,
  id,
  user_id,
  requested_role,
  status,
  comments,
  created_at
FROM public.approvals 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar políticas RLS activas
SELECT 
  'POLÍTICAS RLS USERS' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

SELECT 
  'POLÍTICAS RLS APPROVALS' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'approvals';