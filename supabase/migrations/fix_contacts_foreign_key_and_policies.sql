-- Migración para corregir foreign key de contacts y políticas RLS
-- Fecha: 2024-01-20

-- 1. Eliminar la foreign key incorrecta que apunta a auth.users
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;

-- 2. Agregar la foreign key correcta que apunta a public.users
ALTER TABLE contacts 
ADD CONSTRAINT contacts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 3. Eliminar políticas RLS existentes para contacts
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contacts;

-- 4. Crear nuevas políticas RLS más permisivas para contacts

-- Política de SELECT: Usuarios autenticados pueden ver sus contactos y los asignados a ellos
CREATE POLICY "contacts_select_policy" ON contacts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  assigned_to::uuid = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Política de INSERT: Usuarios autenticados pueden crear contactos
CREATE POLICY "contacts_insert_policy" ON contacts
FOR INSERT
TO authenticated
WITH CHECK (
  -- El usuario puede crear contactos para sí mismo
  user_id = auth.uid() OR
  -- O si es admin/manager puede crear para otros
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Política de UPDATE: Usuarios pueden actualizar sus contactos o los asignados a ellos
CREATE POLICY "contacts_update_policy" ON contacts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  assigned_to::uuid = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  user_id = auth.uid() OR 
  assigned_to::uuid = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Política de DELETE: Solo propietarios y admins/managers pueden eliminar
CREATE POLICY "contacts_delete_policy" ON contacts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- 5. Asegurar que RLS esté habilitado
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 6. Otorgar permisos básicos a los roles
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT ON contacts TO anon;

-- 7. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- 8. Comentarios para documentación
COMMENT ON POLICY "contacts_select_policy" ON contacts IS 'Permite a usuarios autenticados ver sus contactos, los asignados a ellos, o todos si son admin/manager';
COMMENT ON POLICY "contacts_insert_policy" ON contacts IS 'Permite a usuarios autenticados crear contactos para sí mismos o para otros si son admin/manager';
COMMENT ON POLICY "contacts_update_policy" ON contacts IS 'Permite actualizar contactos propios, asignados, o cualquiera si es admin/manager';
COMMENT ON POLICY "contacts_delete_policy" ON contacts IS 'Permite eliminar contactos propios o cualquiera si es admin/manager';