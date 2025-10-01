-- Consultar el estado actual del usuario 'gio'
SELECT 
    id,
    email,
    full_name,
    role,
    is_approved,
    created_at,
    updated_at,
    approved_by,
    approved_at
FROM users 
WHERE email ILIKE '%gio%' 
   OR full_name ILIKE '%gio%'
   OR id = '550e8400-e29b-41d4-a716-446655440000';

-- También verificar si hay registros en la tabla de aprobaciones
SELECT 
    a.id,
    a.user_id,
    a.status,
    a.requested_role,
    a.current_role,
    a.created_at,
    u.email as user_email
FROM approvals a
JOIN users u ON a.user_id = u.id
WHERE u.email ILIKE '%gio%' 
   OR u.full_name ILIKE '%gio%'
   OR a.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY a.created_at DESC;