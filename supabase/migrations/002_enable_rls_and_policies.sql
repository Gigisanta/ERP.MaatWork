-- Habilitar RLS en las tablas users y approvals
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla users
-- Permitir que usuarios autenticados puedan insertar sus propios perfiles
CREATE POLICY "Usuarios pueden insertar sus propios perfiles" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Permitir que usuarios autenticados puedan ver sus propios perfiles
CREATE POLICY "Usuarios pueden ver sus propios perfiles" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Permitir que usuarios autenticados puedan actualizar sus propios perfiles
CREATE POLICY "Usuarios pueden actualizar sus propios perfiles" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Permitir que admins puedan ver todos los usuarios
CREATE POLICY "Admins pueden ver todos los usuarios" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'admin'
    )
  );

-- Permitir que admins puedan actualizar cualquier usuario
CREATE POLICY "Admins pueden actualizar cualquier usuario" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'admin'
    )
  );

-- Políticas para la tabla approvals
-- Permitir que usuarios autenticados puedan insertar solicitudes de aprobación
CREATE POLICY "Usuarios pueden crear solicitudes de aprobación" ON public.approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Permitir que usuarios puedan ver sus propias solicitudes
CREATE POLICY "Usuarios pueden ver sus propias solicitudes" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Permitir que admins puedan ver todas las solicitudes
CREATE POLICY "Admins pueden ver todas las solicitudes" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'admin'
    )
  );

-- Permitir que admins puedan actualizar solicitudes
CREATE POLICY "Admins pueden actualizar solicitudes" ON public.approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'admin'
    )
  );

-- Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT, INSERT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.approvals TO anon;
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;

-- Permitir el uso de las secuencias
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated