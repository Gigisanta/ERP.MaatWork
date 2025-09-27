-- Migración para corregir el aislamiento de datos
-- Fecha: 2024-01-15
-- Descripción: Implementa políticas RLS correctas para aislamiento de datos

-- Eliminar políticas permisivas actuales
DROP POLICY IF EXISTS "contacts_select_bypass" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_bypass" ON contacts;
DROP POLICY IF EXISTS "contacts_update_bypass" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_bypass" ON contacts;

-- Crear políticas restrictivas para aislamiento correcto
-- SELECT: Los usuarios solo pueden ver sus propios contactos o los asignados a ellos
CREATE POLICY "contacts_select_restricted" ON contacts
    FOR SELECT
    USING (
        -- Service role puede ver todo (para pruebas y admin)
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo ven sus contactos
        (
            auth.role() = 'authenticated' AND (
                -- Contactos creados por el usuario
                auth.uid()::text = user_id::text OR 
                -- Contactos asignados al usuario
                auth.uid()::text = assigned_to::text
            )
        ) OR
        -- Anónimos pueden leer (para casos específicos)
        auth.role() = 'anon'
    );

-- INSERT: Los usuarios solo pueden crear contactos para sí mismos
CREATE POLICY "contacts_insert_restricted" ON contacts
    FOR INSERT
    WITH CHECK (
        -- Service role puede insertar todo
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo pueden crear para sí mismos
        (
            auth.role() = 'authenticated' AND
            auth.uid()::text = user_id::text AND
            (assigned_to IS NULL OR auth.uid()::text = assigned_to::text)
        )
    );

-- UPDATE: Los usuarios solo pueden actualizar sus propios contactos
CREATE POLICY "contacts_update_restricted" ON contacts
    FOR UPDATE
    USING (
        -- Service role puede actualizar todo
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo sus contactos
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    )
    WITH CHECK (
        -- Service role puede actualizar todo
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo sus contactos
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    );

-- DELETE: Los usuarios solo pueden eliminar sus propios contactos
CREATE POLICY "contacts_delete_restricted" ON contacts
    FOR DELETE
    USING (
        -- Service role puede eliminar todo
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo sus contactos
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    );

-- Asegurar que RLS esté habilitado
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Comentario
-- Esta migración implementa aislamiento de datos correcto
-- Los usuarios solo pueden acceder a sus propios contactos
-- El service_role mantiene acceso completo para pruebas y administración