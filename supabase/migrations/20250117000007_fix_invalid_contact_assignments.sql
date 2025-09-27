-- Migración para corregir asignaciones inválidas de contactos
-- Fecha: 2025-01-17
-- Problema: Contactos asignados a IDs de usuarios inexistentes
-- assigned_to es VARCHAR, users.id es UUID

-- 1. Obtener el ID del usuario admin para reasignar contactos huérfanos
DO $$
DECLARE
    admin_user_id UUID;
    affected_count INTEGER;
BEGIN
    -- Buscar el primer usuario admin
    SELECT id INTO admin_user_id 
    FROM users 
    WHERE role = 'admin' 
    AND is_approved = true
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró un usuario admin aprobado para reasignar contactos';
    END IF;
    
    RAISE NOTICE 'Usuario admin encontrado: %', admin_user_id;
    
    -- Actualizar contactos con assigned_to inválido (no existe en users)
    -- Usamos cast para comparar VARCHAR con UUID
    UPDATE contacts 
    SET assigned_to = admin_user_id::text,
        updated_at = NOW()
    WHERE assigned_to IS NOT NULL 
    AND assigned_to NOT IN (
        SELECT id::text FROM users
    );
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Contactos reasignados al admin: %', affected_count;
END $$;

-- 2. Verificar que todas las asignaciones ahora son válidas
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM contacts c
    WHERE c.assigned_to IS NOT NULL 
    AND c.assigned_to NOT IN (
        SELECT id::text FROM users
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Aún quedan % contactos con asignaciones inválidas', invalid_count;
    ELSE
        RAISE NOTICE '✅ Todas las asignaciones de contactos son ahora válidas';
    END IF;
END $$;

-- 3. Mostrar resumen final
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Resumen de asignaciones por usuario:';
    FOR rec IN 
        SELECT u.full_name, u.role, COUNT(c.id) as contact_count
        FROM users u
        LEFT JOIN contacts c ON u.id::text = c.assigned_to
        GROUP BY u.id, u.full_name, u.role
        ORDER BY contact_count DESC
    LOOP
        RAISE NOTICE '- % (%) -> % contactos', rec.full_name, rec.role, rec.contact_count;
    END LOOP;
END $$;

-- Fin de la migración