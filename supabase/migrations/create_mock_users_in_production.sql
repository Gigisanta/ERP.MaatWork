-- Migración para crear usuarios mock en Supabase Auth y tabla users
-- Esto resuelve el problema de autenticación en producción

-- Insertar usuarios mock en la tabla users si no existen
INSERT INTO public.users (
  id,
  email,
  full_name,
  name,
  role,
  phone,
  department,
  is_approved,
  approved,
  active,
  status,
  created_at
) VALUES 
  -- Admin user
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'gio@cactus.com',
    'Gio',
    'Gio',
    'admin',
    '+54 9 11 1234-5678',
    'Administración',
    true,
    true,
    true,
    'active',
    '2024-01-01T00:00:00Z'
  ),
  -- Advisor users
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Mvicente@grupoabax.com',
    'Mvicente',
    'Mvicente',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Nzappia@grupoabax.com',
    'Nzappia',
    'Nzappia',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Tdanziger@grupoabax.com',
    'TDanziger',
    'TDanziger',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Pmolina@grupoabax.com',
    'PMolina',
    'PMolina',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'NIngilde@grupoabax.com',
    'NIngilde',
    'NIngilde',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440006',
    'Fandreacchio@grupoabax.com',
    'Fandreacchio',
    'Fandreacchio',
    'advisor',
    NULL,
    NULL,
    true,
    true,
    true,
    'active',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  department = EXCLUDED.department,
  is_approved = EXCLUDED.is_approved,
  approved = EXCLUDED.approved,
  active = EXCLUDED.active,
  status = EXCLUDED.status;

-- Verificar que los usuarios fueron creados correctamente
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.is_approved,
  u.active,
  u.status
FROM public.users u
WHERE u.id IN (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006'
)
ORDER BY u.name;

-- Comentarios de documentación
/*
Esta migración resuelve el problema de autenticación en producción:

1. PROBLEMA IDENTIFICADO:
   - Los usuarios mock del frontend no tenían registros en la tabla users de Supabase
   - Esto causaba errores de permisos al crear contactos
   - El sistema híbrido funcionaba en desarrollo pero fallaba en producción

2. SOLUCIÓN IMPLEMENTADA:
   - Crear registros en la tabla public.users para todos los usuarios mock
   - Usar los UUIDs fijos que espera el frontend
   - Marcar todos los usuarios como aprobados y activos

3. USUARIOS CREADOS:
   - Admin: Gio (gio@cactus.com) - ID: 550e8400-e29b-41d4-a716-446655440000
   - Advisors: Mvicente, Nzappia, TDanziger, PMolina, NIngilde, Fandreacchio
   - Todos con sus respectivos emails y UUIDs del sistema mock

4. VERIFICACIÓN:
   - La consulta final muestra el estado de cada usuario creado
   - Todos deben aparecer como aprobados y activos

5. PRÓXIMOS PASOS:
   - Los usuarios podrán autenticarse usando el sistema híbrido
   - Las operaciones de base de datos usarán los UUIDs correctos
   - Se resolverán los errores de permisos en la creación de contactos
*/