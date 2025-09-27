-- =============================================
-- MIGRACIÓN PASO A PASO: Corrección Foreign Key Constraint
-- =============================================
-- Estrategia: Eliminar constraint primero, limpiar datos, recrear constraint
-- Fecha: 2025-01-17
-- Archivo: 20250117000002_fix_tags_step_by_step.sql

BEGIN;

-- =============================================
-- PASO 1: BACKUP Y DIAGNÓSTICO
-- =============================================

-- Crear tabla de respaldo
CREATE TABLE IF NOT EXISTS tags_backup_step_by_step AS 
SELECT * FROM public.tags;

-- Diagnóstico inicial
DO $$
DECLARE
    total_tags INTEGER;
    orphaned_tags INTEGER;
    valid_tags INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tags FROM public.tags;
    
    SELECT COUNT(*) INTO orphaned_tags
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    SELECT COUNT(*) INTO valid_tags
    FROM public.tags t
    INNER JOIN public.users u ON t.created_by = u.id;
    
    RAISE NOTICE '=== DIAGNÓSTICO INICIAL ===';
    RAISE NOTICE 'Total tags: %', total_tags;
    RAISE NOTICE 'Tags válidos: %', valid_tags;
    RAISE NOTICE 'Tags huérfanos: %', orphaned_tags;
END $$;

-- =============================================
-- PASO 2: ELIMINAR CONSTRAINT PROBLEMÁTICO
-- =============================================

-- Eliminar el constraint que está causando problemas
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

RAISE NOTICE '✅ Constraint eliminado - ahora podemos modificar los datos';

-- =============================================
-- PASO 3: LIMPIAR DATOS HUÉRFANOS
-- =============================================

-- Estrategia: Asignar tags huérfanos al primer usuario disponible
DO $$
DECLARE
    first_user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Obtener el primer usuario disponible
    SELECT id INTO first_user_id 
    FROM public.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Actualizar tags huérfanos (ahora sin constraint)
        UPDATE public.tags 
        SET created_by = first_user_id
        WHERE created_by IS NULL 
           OR created_by NOT IN (SELECT id FROM public.users);
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        RAISE NOTICE '✅ Tags huérfanos asignados al usuario %: % registros', first_user_id, updated_count;
    ELSE
        -- Si no hay usuarios, crear un usuario temporal o eliminar tags
        RAISE NOTICE '⚠️ No hay usuarios en public.users - eliminando tags huérfanos';
        
        DELETE FROM public.tags 
        WHERE created_by IS NULL 
           OR created_by NOT IN (SELECT id FROM public.users);
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE '🗑️ Tags huérfanos eliminados: % registros', updated_count;
    END IF;
END $$;

-- =============================================
-- PASO 4: VERIFICAR LIMPIEZA
-- =============================================

DO $$
DECLARE
    remaining_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphans
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    IF remaining_orphans > 0 THEN
        RAISE EXCEPTION 'ERROR: Aún quedan % tags huérfanos después de la limpieza', remaining_orphans;
    ELSE
        RAISE NOTICE '✅ Limpieza completada - no quedan tags huérfanos';
    END IF;
END $$;

-- =============================================
-- PASO 5: CREAR NUEVO CONSTRAINT CORRECTO
-- =============================================

-- Ahora crear el constraint correcto que referencia public.users
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

RAISE NOTICE '✅ Nuevo constraint creado - referencia public.users(id)';

-- =============================================
-- PASO 6: ACTUALIZAR POLÍTICAS RLS
-- =============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view all tags" ON public.tags;

-- Crear función auxiliar
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

GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- Crear políticas RLS
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

RAISE NOTICE '✅ Políticas RLS actualizadas';

-- =============================================
-- PASO 7: VERIFICACIÓN FINAL COMPLETA
-- =============================================

DO $$
DECLARE
    constraint_exists BOOLEAN;
    policy_count INTEGER;
    total_tags INTEGER;
    valid_tags INTEGER;
    orphaned_tags INTEGER;
BEGIN
    -- Verificar constraint
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tags' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name = 'tags_created_by_fkey'
    ) INTO constraint_exists;
    
    -- Verificar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tags';
    
    -- Verificar integridad de datos
    SELECT COUNT(*) INTO total_tags FROM public.tags;
    
    SELECT COUNT(*) INTO valid_tags
    FROM public.tags t
    INNER JOIN public.users u ON t.created_by = u.id;
    
    SELECT COUNT(*) INTO orphaned_tags
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    RAISE NOTICE 'Constraint existe: %', constraint_exists;
    RAISE NOTICE 'Políticas RLS: %', policy_count;
    RAISE NOTICE 'Total tags: %', total_tags;
    RAISE NOTICE 'Tags válidos: %', valid_tags;
    RAISE NOTICE 'Tags huérfanos: %', orphaned_tags;
    
    -- Validaciones
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'ERROR: Constraint no fue creado';
    END IF;
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'ERROR: Faltan políticas RLS (esperadas: 4, encontradas: %)', policy_count;
    END IF;
    
    IF orphaned_tags > 0 THEN
        RAISE EXCEPTION 'ERROR: Aún existen % tags huérfanos', orphaned_tags;
    END IF;
    
    IF total_tags != valid_tags THEN
        RAISE EXCEPTION 'ERROR: No todos los tags son válidos (total: %, válidos: %)', total_tags, valid_tags;
    END IF;
END $$;

-- =============================================
-- PASO 8: DOCUMENTACIÓN Y COMENTARIOS
-- =============================================

COMMENT ON CONSTRAINT tags_created_by_fkey ON public.tags IS 
'Foreign key constraint corregida - referencia public.users(id) en lugar de auth.users(id)';

COMMENT ON FUNCTION get_current_user_id() IS 
'Función auxiliar para obtener el ID de public.users basado en el usuario autenticado';

-- =============================================
-- FINALIZACIÓN
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== MIGRACIÓN COMPLETADA EXITOSAMENTE =====';
    RAISE NOTICE '✅ Foreign key constraint corregido';
    RAISE NOTICE '✅ Datos huérfanos limpiados';
    RAISE NOTICE '✅ Políticas RLS actualizadas';
    RAISE NOTICE '✅ Función auxiliar creada';
    RAISE NOTICE '📋 Backup disponible en: tags_backup_step_by_step';
    RAISE NOTICE '';
END $$;

COMMIT;

-- =============================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================

/*
PRÓXIMOS PASOS:

1. Probar creación de etiquetas desde la aplicación
2. Verificar logs de errores
3. Monitorear integridad de datos por 24-48 horas
4. Eliminar backup si todo funciona correctamente:
   DROP TABLE tags_backup_step_by_step;

ROLLBACK EN CASO DE EMERGENCIA:
- Restaurar desde backup
- Revertir constraint a auth.users(id)
*/