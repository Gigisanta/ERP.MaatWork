-- =============================================
-- MIGRACIÓN CRÍTICA: Corrección Foreign Key Constraint en Tabla Tags
-- =============================================
-- Problema: tags.created_by referencia auth.users(id) pero el sistema usa public.users
-- Solución: Cambiar referencia a public.users(id)
-- Fecha: 2025-01-17
-- Archivo: 20250117000000_fix_tags_foreign_key_constraint.sql

BEGIN;

-- =============================================
-- DIAGNÓSTICO Y BACKUP
-- =============================================

-- Crear tabla de respaldo
CREATE TABLE IF NOT EXISTS tags_backup_20250117 AS 
SELECT * FROM public.tags;

-- Log del estado actual
DO $$
DECLARE
    tag_count INTEGER;
    constraint_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO tag_count FROM public.tags;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tags' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%created_by%'
    ) INTO constraint_exists;
    
    RAISE NOTICE 'MIGRACIÓN INICIADA:';
    RAISE NOTICE '- Total tags existentes: %', tag_count;
    RAISE NOTICE '- Constraint created_by existe: %', constraint_exists;
END $$;

-- =============================================
-- CORRECCIÓN DEL CONSTRAINT
-- =============================================

-- Eliminar constraint problemática
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Agregar nueva constraint correcta
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- =============================================
-- ACTUALIZAR POLÍTICAS RLS
-- =============================================

-- Eliminar políticas existentes que pueden estar mal configuradas
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

-- Crear políticas RLS mejoradas
-- Política para INSERT: permite crear etiquetas a usuarios autenticados
CREATE POLICY "Users can create tags" ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Verificar que el created_by corresponde al usuario actual
        created_by = (
            SELECT u.id FROM public.users u
            INNER JOIN auth.users au ON u.email = au.email
            WHERE au.id = auth.uid()
            LIMIT 1
        )
    );

-- Política para UPDATE: permite actualizar solo las etiquetas propias
CREATE POLICY "Users can update their own tags" ON public.tags
    FOR UPDATE
    TO authenticated
    USING (
        created_by = (
            SELECT u.id FROM public.users u
            INNER JOIN auth.users au ON u.email = au.email
            WHERE au.id = auth.uid()
            LIMIT 1
        )
    )
    WITH CHECK (
        created_by = (
            SELECT u.id FROM public.users u
            INNER JOIN auth.users au ON u.email = au.email
            WHERE au.id = auth.uid()
            LIMIT 1
        )
    );

-- Política para DELETE: permite eliminar solo las etiquetas propias
CREATE POLICY "Users can delete their own tags" ON public.tags
    FOR DELETE
    TO authenticated
    USING (
        created_by = (
            SELECT u.id FROM public.users u
            INNER JOIN auth.users au ON u.email = au.email
            WHERE au.id = auth.uid()
            LIMIT 1
        )
    );

-- =============================================
-- FUNCIÓN AUXILIAR PARA OBTENER USER_ID
-- =============================================

-- Crear función para obtener el ID de public.users basado en auth.uid()
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

-- =============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================

DO $$
DECLARE
    constraint_count INTEGER;
    policy_count INTEGER;
    integrity_check INTEGER;
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
    SELECT COUNT(*) INTO integrity_check
    FROM public.tags t
    LEFT JOIN public.users u ON t.created_by = u.id
    WHERE u.id IS NULL;
    
    RAISE NOTICE 'MIGRACIÓN COMPLETADA:';
    RAISE NOTICE '- Constraint creado: %', (constraint_count > 0);
    RAISE NOTICE '- Políticas RLS: %', policy_count;
    RAISE NOTICE '- Tags huérfanos: %', integrity_check;
    
    IF constraint_count = 0 THEN
        RAISE EXCEPTION 'ERROR: Constraint no fue creado correctamente';
    END IF;
    
    IF policy_count < 3 THEN
        RAISE EXCEPTION 'ERROR: No se crearon todas las políticas RLS';
    END IF;
END $$;

-- =============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON CONSTRAINT tags_created_by_fkey ON public.tags IS 
'Foreign key constraint corregida - referencia public.users(id) en lugar de auth.users(id)';

COMMENT ON FUNCTION get_current_user_id() IS 
'Función auxiliar para obtener el ID de public.users basado en el usuario autenticado en auth.users';

-- =============================================
-- FINALIZACIÓN
-- =============================================

-- Log final
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN EXITOSA: Foreign key constraint corregido';
    RAISE NOTICE '📋 Backup creado en: tags_backup_20250117';
    RAISE NOTICE '🔧 Función auxiliar: get_current_user_id() disponible';
    RAISE NOTICE '🛡️ Políticas RLS actualizadas y funcionales';
END $$;

COMMIT;

-- =============================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================

/*
DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:

1. Probar la creación de etiquetas desde la aplicación
2. Verificar que no hay errores en los logs
3. Monitorear la integridad de datos con:
   SELECT * FROM tags_health_check;

4. Si todo funciona correctamente después de 24-48 horas:
   DROP TABLE tags_backup_20250117;

5. En caso de problemas, rollback disponible:
   - Restaurar desde backup
   - Revertir constraint a auth.users(id)
*/