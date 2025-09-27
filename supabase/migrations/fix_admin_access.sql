-- Migración para permitir acceso completo al service_role
-- Fecha: 2024-01-15
-- Descripción: Permite al service_role (admin) crear y gestionar contactos sin restricciones RLS

-- Eliminar políticas existentes de contactos
DROP POLICY IF EXISTS "contacts_select_own" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_own" ON contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_own" ON contacts;
DROP POLICY IF EXISTS "contacts_anon_read" ON contacts;

-- Crear políticas que permitan acceso completo al service_role
-- Política para SELECT: service_role puede ver todo, usuarios autenticados ven solo lo suyo
CREATE POLICY "contacts_select_policy" ON contacts
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        ) OR
        auth.role() = 'anon'
    );

-- Política para INSERT: service_role puede insertar todo, usuarios solo para sí mismos
CREATE POLICY "contacts_insert_policy" ON contacts
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.role() = 'authenticated' AND
            auth.uid()::text = user_id::text AND
            (assigned_to IS NULL OR auth.uid()::text = assigned_to::text)
        )
    );

-- Política para UPDATE: service_role puede actualizar todo, usuarios solo lo suyo
CREATE POLICY "contacts_update_policy" ON contacts
    FOR UPDATE
    USING (
        auth.role() = 'service_role' OR
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    );

-- Política para DELETE: service_role puede eliminar todo, usuarios solo lo suyo
CREATE POLICY "contacts_delete_policy" ON contacts
    FOR DELETE
    USING (
        auth.role() = 'service_role' OR
        (
            auth.role() = 'authenticated' AND (
                auth.uid()::text = user_id::text OR 
                auth.uid()::text = assigned_to::text
            )
        )
    );

-- Comentario
-- Esta migración permite al service_role (admin/supabase) acceso completo
-- mientras mantiene el aislamiento de datos para usuarios regulares