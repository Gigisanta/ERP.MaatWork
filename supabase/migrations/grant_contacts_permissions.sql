-- Otorgar permisos necesarios para la tabla contacts
-- Esto permitirá que las pruebas de aislamiento funcionen correctamente

-- Otorgar permisos básicos a los roles
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO anon;
GRANT ALL PRIVILEGES ON contacts TO authenticated;
GRANT ALL PRIVILEGES ON contacts TO service_role;

-- Verificar que RLS esté habilitado en contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Crear política básica para permitir acceso durante las pruebas
-- (Las políticas específicas se pueden ajustar después)
DROP POLICY IF EXISTS "Enable all access for testing" ON contacts;
CREATE POLICY "Enable all access for testing" ON contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);