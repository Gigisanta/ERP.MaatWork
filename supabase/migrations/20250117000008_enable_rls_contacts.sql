-- =============================================
-- HABILITAR RLS EN TABLA CONTACTS
-- Habilita Row Level Security en la tabla contacts
-- =============================================

-- Habilitar RLS en la tabla contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Verificar que RLS está habilitado
DO $$
BEGIN
  -- Verificar que RLS está habilitado en contacts
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_class 
    WHERE relname = 'contacts' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS no está habilitado en la tabla contacts';
  END IF;
  
  RAISE NOTICE 'RLS habilitado correctamente en la tabla contacts';
END $$;

-- Verificar que las políticas existen
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
  
  RAISE NOTICE 'Encontradas % políticas RLS para la tabla contacts', policy_count;
END $$;

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250117000008_enable_rls_contacts applied successfully at %', NOW();
END $$;

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================