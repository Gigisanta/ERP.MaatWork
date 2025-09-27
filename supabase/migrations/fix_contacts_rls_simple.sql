-- Eliminar políticas existentes
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;

-- Crear políticas RLS simples para la tabla contacts
-- Política de SELECT: Los usuarios solo pueden ver contactos asignados a ellos
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    assigned_to = auth.uid()::text
  );

-- Política de INSERT: Los usuarios solo pueden crear contactos asignados a ellos mismos
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    assigned_to = auth.uid()::text
  );

-- Política de UPDATE: Los usuarios solo pueden actualizar contactos asignados a ellos
CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    assigned_to = auth.uid()::text
  );

-- Política de DELETE: Los usuarios solo pueden eliminar contactos asignados a ellos
CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    assigned_to = auth.