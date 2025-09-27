-- =============================================
-- MIGRACIÓN SEGURA: Corrección Foreign Key Constraint en Tabla Tags
-- =============================================
-- Problema: tags.created_by referencia auth.users(id) pero hay datos huérfanos
-- Solución: Limpiar datos huérfanos y cambiar referencia a public.users(id)
-- Fecha: 2025-01-17
-- Archivo: 20250117000001_fix_tags_foreign_key_safe.sql

BEGIN;

-- =============================================
-- PASO 1: DIAGNÓSTICO Y BACKUP
-- =============================================

-- Crear tabla de respaldo
CREATE TABLE IF NOT EXISTS tags_backup_20250117_safe AS 
SELECT * FROM public.tags;

-- Verificar datos huérfanos
DO $$
DECLARE
    orphaned_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.tags;
    
    SELECT COUNT(*) INTO orphaned_count
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    RAISE NOTICE 'DIAGNÓSTICO INICIAL:';
    RAISE NOTICE '- Total tags: %', total_count;
    RAISE NOTICE '- Tags huérfanos: %', orphaned_count;
END $$;

-- =============================================
-- PASO 2: LIMPIAR DATOS HUÉRFANOS
-- =============================================

-- Opción 1: Asignar tags huérfanos al primer usuario disponible
-- (Si existe al menos un usuario en public.users)
DO $$
DECLARE
    first_user_id UUID;
    orphaned_count INTEGER;
BEGIN
    -- Obtener el primer usuario disponible
    SELECT id INTO first_user_id FROM public.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Actualizar tags huérfanos
        UPDATE public.tags 
        SET created_by = first_user_id
        WHERE created_by NOT IN (SELECT id FROM public.users);
        
        GET DIAGNOSTICS orphaned_count = ROW_COUNT;
        RAISE NOTICE 'Tags huérfanos asignados al usuario %: %', first_user_id, orphaned_count;
    ELSE
        -- Si no hay usuarios, eliminar tags huérfanos
        DELETE FROM public.tags 
        WHERE created_by NOT IN (SELECT id FROM public.users);
        
        GET DIAGNOSTICS orphaned_count = ROW_COUNT;
        RAISE NOTICE 'Tags huérfanos eliminados (no hay usuarios): %', orphaned_count;
    END IF;
END $$;

-- =============================================
-- PASO 3: ELIMINAR CONSTRAINT ACTUAL
-- =============================================

-- Eliminar constraint problemática
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Verificar que se eliminó
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tags' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name = 'tags_created_by_fkey'
    ) THEN
        RAISE NOTICE '✅ Constraint anterior eliminado correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo eliminar el constraint anterior';
    END IF;
END $$;

-- =============================================
-- PASO 4: CREAR NUEVO CONSTRAINT
-- =============================================

-- Agregar nueva constraint correcta que referencia public.users
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- =============================================
-- PASO 5: ACTUALIZAR POLÍTICAS RLS
-- =============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view all tags" ON public.tags;

-- Crear función auxiliar para obtener user_id
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT u.id INTO user_id
    FROM public.users u
    INNER JOIN auth.users au ON u.email = au.email
    WHERE au.id = auth.uid()
    LIMIT 1;
    
    RETURN user_id;
END;
$$;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- Crear políticas RLS mejoradas
CREATE POLICY "Users can view all tags" ON public.tags
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tags" ON public.tags
    FOR INSERT TO authenticated
    WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "Users can update their own tags" ON public.tags
    FOR UPDATE TO authenticated
    USING (created_by = get_current_user_id())
    WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "Users can delete their own tags" ON public.tags
    FOR DELETE TO authenticated
    USING (created_by = get_current_user_id());

-- =============================================
-- PASO 6: VERIFICACIÓN FINAL
-- =============================================

DO $$
DECLARE
    constraint_count INTEGER;
    policy_count INTEGER;
    orphaned_count INTEGER;
    total_tags INTEGER;
BEGIN
    -- Verificar constraint
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'tags' 
    AND constraint_type = 'FOREIGN KEY' 
    AND constraint_name = 'tags_created_by_fkey';
    
    -- Verificar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tags';
    
    -- Verificar integridad de datos
    SELECT COUNT(*) INTO total_tags FROM public.tags;
    
    SELECT COUNT(*) INTO orphaned_count
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    RAISE NOTICE 'VERIFICACIÓN FINAL:';
    RAISE NOTICE '- Constraint creado: %', (constraint_count > 0);
    RAISE NOTICE '- Políticas RLS: %', policy_count;
    RAISE NOTICE '- Total tags: %', total_tags;
    RAISE NOTICE '- Tags huérfanos restantes: %', orphaned_count;
    
    IF constraint_count = 0 THEN
        RAISE EXCEPTION 'ERROR: Constraint no fue creado correctamente';
    END IF;
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'ERROR: No se crearon todas las políticas RLS';
    END IF;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'ERROR: Aún existen tags huérfanos después de la limpieza';
    END IF;
END $$;

-- =============================================
-- PASO 7: COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON CONSTRAINT tags_created_by_fkey ON public.tags IS 
'Foreign key constraint corregida - referencia public.users(id) en lugar de auth.users(id)';

COMMENT ON FUNCTION get_current_user_id() IS 
'Función auxiliar para obtener el ID de public.users basado en el usuario autenticado en auth.users';

-- Log final
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN SEGURA COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📋 Backup creado en: tags_backup_20250117_safe';
    RAISE NOTICE '🔧 Función auxiliar: get_current_user_id() disponible';
    RAISE NOTICE '🛡️ Políticas RLS actualizadas y funcionales';
    RAISE NOTICE '🧹 Datos huérfanos limpiados automáticamente';
END $$;

COMMIT;

-- =============================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================

/*
DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:

1. Probar la creación de etiquetas desde la aplicación
2. Verificar que no hay errores en los logs
3. Monitorear la integridad de datos
4. Si todo funciona correctamente después de 24-48 horas:
   DROP TABLE tags_backup_20250117_safe;

5. En caso de problemas, rollback disponible desde el backup
*/