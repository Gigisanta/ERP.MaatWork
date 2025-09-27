-- Verificar permisos actuales para la tabla notes
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'notes'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos básicos a los roles
GRANT SELECT ON notes TO anon;
GRANT ALL PRIVILEGES ON notes TO authenticated;

-- Crear políticas RLS para la tabla notes si no existen
DROP POLICY IF EXISTS "Users can view notes for their contacts" ON notes;
DROP POLICY IF EXISTS "Users can insert notes for their contacts" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Política para ver notas (solo de contactos asignados al usuario)
CREATE POLICY "Users can view notes for their contacts" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id::text = notes.contact_id 
      AND contacts.assigned_to::uuid = auth.uid()
    )
  );

-- Política para insertar notas (solo en contactos asignados al usuario)
CREATE POLICY "Users can insert notes for their contacts" ON notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id::text = notes.contact_id 
      AND contacts.assigned_to::uuid = auth.uid()
    )
    AND author_id = auth.uid()
  );

-- Política para actualizar notas (solo las propias)
CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Política para eliminar notas (solo las propias)
CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (author_id = auth.uid());

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'notes';