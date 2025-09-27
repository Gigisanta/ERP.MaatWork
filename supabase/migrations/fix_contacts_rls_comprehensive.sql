-- Eliminar políticas RLS existentes
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- Habilitar RLS en la tabla contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuarios pueden ver contactos asignados a ellos o todos si son managers/admins
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    -- El contacto está asignado al usuario actual
    assigned_to = auth.uid()::text
    OR
    -- El usuario es manager o admin (puede ver todos los contactos)
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Política INSERT: Usuarios autenticados pueden crear contactos
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    -- El usuario debe estar autenticado
    auth.uid() IS NOT NULL
    AND
    -- Si es advisor, solo puede asignar contactos a sí mismo
    (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'advisor'
        AND assigned_to = auth.uid()::text
      )
      OR
      -- Si es manager/admin, puede asignar a cualquiera
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin')
      )
    )
  );

-- Política UPDATE: Usuarios pueden actualizar contactos según su rol
CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    -- El contacto está asignado al usuario actual
    assigned_to = auth.uid()::text
    OR
    -- El usuario es manager o admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    -- Mismas reglas que INSERT para la nueva versión del registro
    auth.uid() IS NOT NULL
    AND
    (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'advisor'
        AND assigned_to = auth.uid()::text
      )
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin')
      )
    )
  );

-- Política DELETE: Solo managers y admins pueden eliminar contactos
CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Otorgar permisos básicos a roles autenticados
GRANT SELECT, INSERT, UPDATE ON contacts TO authenticated;
GRANT DELETE ON contacts TO authenticated;

-- Asegurar que los usuarios anónimos no tengan acceso
REVOKE ALL ON contacts FROM anon;