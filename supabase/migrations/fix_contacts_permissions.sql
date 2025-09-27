-- Migración para configurar permisos y políticas RLS en la tabla contacts
-- Esto permite que los usuarios autenticados puedan crear y gestionar contactos

-- 1. Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT ON contacts TO anon;
GRANT ALL PRIVILEGES ON contacts TO authenticated;

-- 2. Crear políticas RLS para la tabla contacts

-- Política para permitir que usuarios autenticados vean todos los contactos
-- (esto puede ajustarse según los requerimientos de negocio)
CREATE POLICY "Users can view all contacts" ON contacts
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir que usuarios autenticados inserten contactos
CREATE POLICY "Users can insert contacts" ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir que usuarios autenticados actualicen contactos
CREATE POLICY "Users can update contacts" ON contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para permitir que usuarios autenticados eliminen contactos
CREATE POLICY "Users can delete contacts" ON contacts
  FOR DELETE
  TO authenticated
  USING (true);

-- 3. Verificar que las políticas fueron creadas correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'contacts'
ORDER BY policyname;

-- 4. Verificar permisos otorgados
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee, privilege_type;

-- Comentarios de documentación
/*
Esta migración configura los permisos necesarios para la tabla contacts:

1. PERMISOS OTORGADOS:
   - anon: SELECT (lectura básica)
   - authenticated: ALL PRIVILEGES (lectura, escritura, actualización, eliminación)

2. POLÍTICAS RLS CREADAS:
   - "Users can view all contacts": Permite a usuarios autenticados ver todos los contactos
   - "Users can insert contacts": Permite a usuarios autenticados crear nuevos contactos
   - "Users can update contacts": Permite a usuarios autenticados actualizar contactos
   - "Users can delete contacts": Permite a usuarios autenticados eliminar contactos

3. CONFIGURACIÓN DE SEGURIDAD:
   - Las políticas están configuradas para permitir acceso completo a usuarios autenticados
   - Esto puede ajustarse en el futuro para implementar restricciones por usuario
   - RLS sigue habilitado para mantener la seguridad de la base de datos

4. VERIFICACIÓN:
   - Las consultas finales muestran las políticas y permisos configurados
   - Esto permite confirmar que la configuración es correcta

Esta configuración resuelve el error "permission denied for table contacts" 
que impedía la creación de contactos en producción.
*/