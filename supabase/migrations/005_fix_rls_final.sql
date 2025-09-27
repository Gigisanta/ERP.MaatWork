-- Eliminar todas las políticas existentes que causan conflictos
DROP POLICY IF EXISTS "usuarios_pueden_insertar" ON public.users;
DROP POLICY IF EXISTS "Permitir inserción de perfiles durante registro" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden insertar perfiles con su propio ID" ON public.users;
DROP POLICY IF EXISTS "Sistema puede crear perfiles" ON public.users;
DROP POLICY IF EXISTS "Permitir creación de solicitudes de aprobación" ON public.approvals;
DROP POLICY IF EXISTS "Sistema puede crear solicitudes" ON public.approvals;

-- Crear política simple para permitir inserción en users
CREATE POLICY "permitir_insercion_usuarios_autenticados" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Crear política para permitir lectura de usuarios
CREATE POLICY "permitir_lectura_usuarios" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Crear política para permitir actualización de usuarios
CREATE POLICY "permitir_actualizacion_usuarios" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Crear política simple para permitir inserción en approvals
CREATE POLICY "permitir_insercion_solicitudes" ON public.approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Crear política para permitir lectura de solicitudes
CREATE POLICY "permitir_lectura_solicitudes" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (true);

-- Asegurar permisos correctos
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.approvals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verificar que RLS esté habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;