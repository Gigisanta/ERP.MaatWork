-- =============================================
-- REVOCAR PERMISOS DEL ROL ANON EN CONTACTS
-- Revoca todos los permisos del rol anon para que RLS funcione correctamente
-- =============================================

-- Revocar todos los permisos del rol anon en la tabla contacts
REVOKE ALL PRIVILEGES ON public.contacts FROM anon;

-- Revocar permisos de uso del esquema public para anon (solo para contacts)
-- Nota: No revocamos USAGE del esquema completo para no romper otras funcionalidades

-- Verificar que los permisos fueron revocados
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count
  FROM information_schema.role_table_grants 
  WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND grantee = 'anon';
  
  IF perm_count > 0 THEN
    RAISE EXCEPTION 'Aún existen % permisos para el rol anon en la tabla contacts', perm_count;
  END IF;
  
  RAISE NOTICE 'Permisos del rol anon revocados correctamente de la tabla contacts';
END $$;

-- Verificar que RLS sigue habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_class 
    WHERE relname = 'contacts' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS no está habilitado en la tabla contacts';
  END IF;
  
  RAISE NOTICE 'RLS sigue habilitado en la tabla contacts';
END $$;

-- Verificar que las políticas siguen existiendo
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'contacts' 
  AND schemaname = 'public';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No hay políticas RLS definidas para la tabla contacts';
  END IF;
  
  RAISE NOTICE 'Políticas RLS siguen activas: % políticas encontradas', policy_count;
END $$;

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250117000009_revoke_anon_permissions applied successfully at %', NOW();
END $$;

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================