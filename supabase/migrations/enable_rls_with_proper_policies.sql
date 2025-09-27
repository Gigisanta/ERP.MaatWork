-- Migración para re-habilitar RLS con políticas correctas
-- Fecha: 2024-01-15
-- Descripción: Habilita RLS con políticas que permiten aislamiento correcto

-- Re-habilitar RLS en la tabla contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Crear políticas que funcionen correctamente
-- SELECT: Permitir acceso basado en user_id y assigned_to
CREATE POLICY "contacts_select_policy" ON contacts
    FOR SELECT
    USING (
        -- Service role puede ver todo (para admin y pruebas)
        auth.role() = 'service_role' OR
        -- Usuarios autenticados ven sus contactos
        (
            auth.role() = 'authenticated' AND (
                -- Contactos donde el usuario es el creador
                auth.uid()::text = user_id::text OR 
                -- Contactos asignados al usuario
                auth.uid()::text = assigned_to::text
            )
        )
    );

-- INSERT: Permitir creación solo para el propio usuario
CREATE POLICY "contacts_insert_policy" ON contacts
    FOR INSERT
    WITH CHECK (
        -- Service role puede insertar todo
        auth.role() = 'service_role' OR
        -- Usuarios autenticados solo para sí mismos
        (
            auth.role() = 'authenticated' AND
            auth.uid()::text = user_id::text
        )
    );

-- UPDATE: Permitir actualización solo de contactos propios
CREATE POLICY "contacts_update_policy" ON contacts
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

-- DELETE: Permitir eliminación solo de contactos propios
CREATE POLICY "contacts_delete_policy" ON contacts
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

-- Mantener permisos para los roles
GRANT ALL PRIVILEGES ON contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT ON contacts TO anon;

-- Comentario
-- Esta migración re-habilita RLS con políticas que deberían funcionar
-- El service_role mantiene acceso completo
-- Los usuarios autenticados solo ven sus propios contactos