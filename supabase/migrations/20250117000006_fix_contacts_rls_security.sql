-- =============================================
-- FIX CONTACTS RLS SECURITY POLICIES
-- Corrige problemas de aislamiento de datos y roles
-- =============================================

-- Función auxiliar para obtener el ID del usuario actual desde public.users
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'advisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar acceso a contactos
CREATE OR REPLACE FUNCTION public.can_access_contact(contact_assigned_to VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
BEGIN
  current_user_id := auth.uid();
  user_role := public.get_current_user_role();
  
  -- Si no hay usuario autenticado, denegar acceso
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin puede ver todos los contactos
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Manager puede ver contactos de su equipo (usuarios que él aprobó o de su departamento)
  IF user_role = 'manager' THEN
    -- Por ahora, manager ve todos los contactos (se puede refinar después)
    RETURN TRUE;
  END IF;
  
  -- Advisor solo puede ver sus propios contactos
  -- Comparar UUID con VARCHAR haciendo cast del UUID a texto
  IF user_role = 'advisor' THEN
    RETURN contact_assigned_to = current_user_id::TEXT;
  END IF;
  
  -- Por defecto, denegar acceso
  RETURN FALSE;
END;
$$;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS contacts_own_select ON public.contacts;
DROP POLICY IF EXISTS contacts_own_modify ON public.contacts;

-- Crear nuevas políticas RLS con jerarquía de roles
CREATE POLICY contacts_role_based_select ON public.contacts
  FOR SELECT
  TO authenticated
  USING (public.can_access_contact(assigned_to));

CREATE POLICY contacts_role_based_insert ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Solo admin y manager pueden crear contactos
    public.get_current_user_role() IN ('admin', 'manager')
    OR
    -- Advisor puede crear contactos asignados a sí mismo
    (public.get_current_user_role() = 'advisor' AND assigned_to = auth.uid()::TEXT)
  );

CREATE POLICY contacts_role_based_update ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (public.can_access_contact(assigned_to))
  WITH CHECK (public.can_access_contact(assigned_to));

CREATE POLICY contacts_role_based_delete ON public.contacts
  FOR DELETE
  TO authenticated
  USING (
    -- Solo admin puede eliminar contactos
    public.get_current_user_role() = 'admin'
    OR
    -- Manager puede eliminar contactos de su equipo
    (public.get_current_user_role() = 'manager' AND public.can_access_contact(assigned_to))
  );

-- Actualizar políticas de contact_status_history
DROP POLICY IF EXISTS contact_history_insert ON public.contact_status_history;
DROP POLICY IF EXISTS contact_history_select ON public.contact_status_history;

CREATE POLICY contact_history_role_based_insert ON public.contact_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()::TEXT
    AND
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_status_history.contact_id
      AND public.can_access_contact(c.assigned_to)
    )
  );

CREATE POLICY contact_history_role_based_select ON public.contact_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_status_history.contact_id
      AND public.can_access_contact(c.assigned_to)
    )
  );

-- Verificar que las políticas se aplicaron correctamente
DO $$
BEGIN
  -- Verificar que las funciones existen
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_id') THEN
    RAISE EXCEPTION 'Función get_current_user_id no fue creada correctamente';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_role') THEN
    RAISE EXCEPTION 'Función get_current_user_role no fue creada correctamente';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_contact') THEN
    RAISE EXCEPTION 'Función can_access_contact no fue creada correctamente';
  END IF;
  
  -- Verificar que las políticas existen
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_role_based_select') THEN
    RAISE EXCEPTION 'Política contacts_role_based_select no fue creada correctamente';
  END IF;
  
  RAISE NOTICE 'Migración de seguridad RLS aplicada correctamente';
END $$;

-- Comentarios de documentación
COMMENT ON FUNCTION public.get_current_user_id() IS 'Obtiene el ID del usuario autenticado actual';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Obtiene el rol del usuario autenticado actual desde public.users';
COMMENT ON FUNCTION public.can_access_contact(VARCHAR) IS 'Verifica si el usuario actual puede acceder a un contacto basado en jerarquía de roles';

-- Log de migración (comentado hasta que se implemente tabla migration_log)
-- INSERT INTO public.migration_log (migration_name, applied_at, description)
-- VALUES (
--   '20250117000006_fix_contacts_rls_security',
--   NOW(),
--   'Corrige políticas RLS de contacts para implementar jerarquía de roles y aislamiento de datos'
-- ) ON CONFLICT (migration_name) DO NOTHING;

-- Log alternativo usando RAISE NOTICE
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250117000006_fix_contacts_rls_security applied successfully at %', NOW();
END $$;

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================