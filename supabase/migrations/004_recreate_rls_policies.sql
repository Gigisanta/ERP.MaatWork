-- Recrear políticas RLS completamente para resolver conflictos

-- Eliminar TODAS las políticas existentes en users
DROP POLICY IF EXISTS "Permitir inserción de perfiles durante registro" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden insertar perfiles con su propio ID" ON public.users;
DROP POLICY IF EXISTS "Sistema puede crear perfiles" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios perfiles" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios perfiles" ON public.users;

-- Eliminar TODAS las políticas existentes en approvals
DROP POLICY IF EXISTS "Permitir creación de solicitudes de aprobación" ON public.approvals;
DROP POLICY IF EXISTS "Sistema puede crear solicitudes" ON public.approvals;
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes de aprobación" ON public.approvals;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias solicitudes" ON public.approvals;

-- Deshabilitar RLS temporalmente para limpiar
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals DISABLE ROW LEVEL SECURITY;

-- Reactivar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Crear políticas simples y efectivas para users
CREATE POLICY "usuarios_pueden_insertar" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "usuarios_pueden_ver_propios" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "usuarios_pueden_actualizar_propios" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Crear políticas simples y efectivas para approvals
CREATE POLICY "usuarios_pueden_crear_solicitudes" ON public.approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "usuarios_pueden_ver_sus_solicitudes" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "admins_pueden_ver_todas_solicitudes" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_pueden_actualizar_solicitudes" ON public.approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Asegurar permisos correctos
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permitir acceso completo al service_role
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.approvals TO service_role;