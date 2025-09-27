-- Migración para implementar políticas RLS correctas
-- Fecha: 2024-01-15
-- Descripción: Políticas RLS que permiten aislamiento de datos pero funcionan con service_role

-- Re-habilitar RLS en la tabla contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Política de selección: usuarios ven solo sus contactos o los asignados a ellos
CREATE POLICY "contacts_select_policy" ON contacts
    FOR SELECT
    USING (
        -- Service role puede ver todo (para pruebas y admin)
        auth.role() = 'service_role'
        OR
        -- Usuarios autenticados ven sus contactos
        (
            auth.role() = 'authenticated'
            AND (
                user_id::text = auth.uid()::text
                OR assigned_to::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id::text = auth.uid()::text 
                    AND users.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Política de inserción: usuarios pueden crear contactos para sí mismos
CREATE POLICY "contacts_insert_policy" ON contacts
    FOR INSERT
    WITH CHECK (
        -- Service role puede insertar cualquier cosa (para pruebas)
        auth.role() = 'service_role'
        OR
        -- Usuarios autenticados pueden crear contactos para sí mismos
        (
            auth.role() = 'authenticated'
            AND (
                user_id::text = auth.uid()::text
                OR assigned_to::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id::text = auth.uid()::text 
                    AND users.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Política de actualización: usuarios pueden actualizar sus contactos
CREATE POLICY "contacts_update_policy" ON contacts
    FOR UPDATE
    USING (
        -- Service role puede actualizar todo (para pruebas)
        auth.role() = 'service_role'
        OR
        -- Usuarios autenticados pueden actualizar sus contactos
        (
            auth.role() = 'authenticated'
            AND (
                user_id::text = auth.uid()::text
                OR assigned_to::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id::text = auth.uid()::text 
                    AND users.role IN ('admin', 'manager')
                )
            )
        )
    )
    WITH CHECK (
        -- Service role puede actualizar a cualquier valor
        auth.role() = 'service_role'
        OR
        -- Usuarios autenticados mantienen ownership
        (
            auth.role() = 'authenticated'
            AND (
                user_id::text = auth.uid()::text
                OR assigned_to::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id::text = auth.uid()::text 
                    AND users.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Política de eliminación: usuarios pueden eliminar sus contactos
CREATE POLICY "contacts_delete_policy" ON contacts
    FOR DELETE
    USING (
        -- Service role puede eliminar todo (para pruebas)
        auth.role() = 'service_role'
        OR
        -- Usuarios autenticados pueden eliminar sus contactos
        (
            auth.role() = 'authenticated'
            AND (
                user_id::text = auth.uid()::text
                OR assigned_to::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id::text = auth.uid()::text 
                    AND users.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Asegurar que el service_role tenga permisos de bypass
GRANT ALL PRIVILEGES ON contacts TO service_role;

-- Comentario
-- Estas políticas permiten:
-- 1. Service role (pruebas) puede hacer cualquier operación
-- 2. Usuarios normales solo ven/modifican sus propios contactos
-- 3. Admins y managers pueden ver/modificar todos los contactos
-- 4. Aislamiento de datos entre usuarios regulares