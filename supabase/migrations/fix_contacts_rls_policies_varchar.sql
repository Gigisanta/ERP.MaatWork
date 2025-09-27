-- Eliminar políticas existentes
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- Crear políticas RLS para la tabla contacts considerando que assigned_to es varchar
-- Política de SELECT: Los advisors solo pueden ver sus propios contactos
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    -- Permitir a admins ver todos los contactos
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'admin'
    )
    OR
    -- Permitir a managers ver contactos de su equipo
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'manager'
    )
    OR
    -- Permitir a advisors ver solo sus propios contactos
    (
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.auth_id = auth.uid()::text 
        AND u.role = 'advisor'
      )
      AND assigned_to = auth.uid()::text
    )
  );

-- Política de INSERT: Los advisors solo pueden crear contactos para sí mismos
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    -- Permitir a admins insertar cualquier contacto
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'admin'
    )
    OR
    -- Permitir a managers insertar contactos
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'manager'
    )
    OR
    -- Permitir a advisors insertar solo contactos asignados a ellos mismos
    (
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.auth_id = auth.uid()::text 
        AND u.role = 'advisor'
      )
      AND assigned_to = auth.uid()::text
    )
  );

-- Política de UPDATE: Los advisors solo pueden actualizar sus propios contactos
CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    -- Permitir a admins actualizar cualquier contacto
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'admin'
    )
    OR
    -- Permitir a managers actualizar contactos
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'manager'
    )
    OR
    -- Permitir a advisors actualizar solo sus propios contactos
    (
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.auth_id = auth.uid()::text 
        AND u.role = 'advisor'
      )
      AND assigned_to = auth.uid()::text
    )
  );

-- Política de DELETE: Los advisors solo pueden eliminar sus propios contactos
CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    -- Permitir a admins eliminar cualquier contacto
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'admin'
    )
    OR
    -- Permitir a managers eliminar contactos
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid()::text 
      AND u.role = 'manager'
    )
    OR
    -- Permitir a advisors eliminar solo sus propios contactos
    (
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.auth_id = auth.uid()::text 
        AND u.role = 'advisor'
      )
      AND assigned_to = auth.uid()::text
    )
  );