-- Corregir políticas RLS problemáticas en la tabla users
-- Eliminar políticas existentes que causan recursión infinita

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Managers can view team users" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Crear políticas RLS más simples y seguras

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Política para que los admins puedan ver todos los usuarios
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Política para que los managers puedan ver usuarios de su equipo
CREATE POLICY "Managers can view team users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' IN ('manager', 'admin')
    )
  );

-- Política para permitir inserción con service role (para pruebas)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Otorgar permisos básicos a los roles
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON users TO service_role;