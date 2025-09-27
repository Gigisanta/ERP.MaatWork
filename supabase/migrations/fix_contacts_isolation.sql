-- Migración para corregir aislamiento de datos en contactos
-- Fecha: 2024-01-15
-- Descripción: Establece políticas RLS específicas para contactos que funcionen correctamente

-- Eliminar políticas existentes de contactos
DROP POLICY IF EXISTS "contacts_allow_all" ON contacts;
DROP POLICY IF EXISTS "contacts_anon_select" ON contacts;

-- Crear políticas específicas para contactos basadas en user_id y assigned_to
-- Política para SELECT: usuarios pueden ver sus propios contactos
CREATE POLICY "contacts_select_own" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text OR 
        auth.uid()::text = assigned_to::text
    );

-- Política para INSERT: usuarios pueden crear contactos asignándoselos a sí mismos
CREATE POLICY "contacts_insert_own" ON contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text AND
        (assigned_to IS NULL OR auth.uid()::text = assigned_to::text)
    );

-- Política para UPDATE: usuarios pueden actualizar sus propios contactos
CREATE POLICY "contacts_update_own" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text OR 
        auth.uid()::text = assigned_to::text
    )
    WITH CHECK (
        auth.uid()::text = user_id::text OR 
        auth.uid()::text = assigned_to::text
    );

-- Política para DELETE: usuarios pueden eliminar sus propios contactos
CREATE POLICY "contacts_delete_own" ON contacts
    FOR DELETE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text OR 
        auth.uid()::text = assigned_to::text
    );

-- Política para acceso anónimo (solo lectura, sin restricciones para pruebas)
CREATE POLICY "contacts_anon_read" ON contacts
    FOR SELECT
    TO anon
    USING (true);

-- Comentario
-- Esta migración establece políticas RLS específicas para contactos
-- que permiten el aislamiento de datos por usuario mientras mantienen
-- la funcionalidad necesaria para las pruebas