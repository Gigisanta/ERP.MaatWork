-- Corregir políticas RLS para permitir registro de usuarios

-- Eliminar políticas existentes que causan conflictos
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios perfiles" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes de aprobación" ON public.approvals;

-- Nueva política para permitir inserción de perfiles durante el registro
-- Esta política permite que usuarios recién registrados puedan crear su perfil
CREATE POLICY "Permitir inserción de perfiles durante registro" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Permitir cualquier inserción para usuarios autenticados

-- Política alternativa más específica para usuarios que se registran
CREATE POLICY "Usuarios pueden insertar perfiles con su propio ID" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permitir si el ID coincide con el usuario autenticado
    auth.uid()::text = id::text
    OR
    -- O si es un usuario recién creado (sin perfil existente)
    NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid()
    )
  );

-- Política para permitir creación de solicitudes de aprobación
CREATE POLICY "Permitir creación de solicitudes de aprobación" ON public.approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permitir si el user_id coincide con el usuario autenticado
    auth.uid()::text = user_id::text
    OR
    -- O si es una solicitud válida de un usuario existente
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = user_id::text
    )
  );

-- Asegurar que los permisos estén correctamente configurados
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;

-- Permitir acceso a las secuencias necesarias
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Política adicional para permitir que el sistema cree perfiles automáticamente
CREATE POLICY "Sistema puede crear perfiles" ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Sistema puede crear solicitudes" ON public.approvals
  FOR INSERT
  TO service_role
  WITH CHECK (true);