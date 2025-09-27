-- Crear políticas RLS específicas para la tabla contacts
-- Esto implementará el aislamiento de datos correcto entre usuarios

-- Eliminar la política de prueba que permite todo acceso
DROP POLICY IF EXISTS "Enable all access for testing" ON contacts;

-- Política para que los advisors solo vean sus propios contactos
CREATE POLICY "Advisors can only view own contacts" ON contacts
  FOR SELECT
  USING (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role IN ('manager', 'admin')
    )
  );

-- Política para que los advisors solo puedan insertar contactos asignados a ellos mismos
CREATE POLICY "Advisors can only insert own contacts" ON contacts
  FOR INSERT
  WITH CHECK (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role IN ('manager', 'admin')
    )
  );

-- Política para que los advisors solo puedan actualizar sus propios contactos
CREATE POLICY "Advisors can only update own contacts" ON contacts
  FOR UPDATE
  USING (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role IN ('manager', 'admin')
    )
  );

-- Política para que los advisors solo puedan eliminar sus propios contactos
CREATE POLICY "Advisors can only delete own contacts" ON contacts
  FOR DELETE
  USING (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role IN ('manager', 'admin')
    )
  );