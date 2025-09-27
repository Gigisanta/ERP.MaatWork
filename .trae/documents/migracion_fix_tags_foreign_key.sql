-- =============================================
-- MIGRACIÓN: Corrección Foreign Key Constraint en Tabla Tags
-- =============================================
-- Problema: La tabla tags referencia auth.users(id) pero el sistema usa public.users
-- Solución: Cambiar la referencia a public.users(id)
-- Fecha: 2025-01-17
-- Prioridad: CRÍTICA

-- =============================================
-- PASO 1: DIAGNÓSTICO INICIAL
-- =============================================

-- Verificar estado actual de la tabla tags
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tags';

-- Verificar constraint actual
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tags'
    AND kcu.column_name = 'created_by';

-- Contar registros existentes
SELECT COUNT(*) as total_tags FROM public.tags;

-- Verificar integridad de datos actual
SELECT 
    COUNT(*) as total_tags,
    COUNT(u.id) as tags_with_valid_creator_in_public_users,
    COUNT(au.id) as tags_with_valid_creator_in_auth_users,
    COUNT(*) - COUNT(u.id) as orphaned_tags_public,
    COUNT(*) - COUNT(au.id) as orphaned_tags_auth
FROM public.tags t
LEFT JOIN public.users u ON t.created_by = u.id
LEFT JOIN auth.users au ON t.created_by = au.id;

-- =============================================
-- PASO 2: BACKUP DE SEGURIDAD
-- =============================================

-- Crear tabla de respaldo temporal
CREATE TABLE IF NOT EXISTS tags_backup_$(date +%Y%m%d) AS 
SELECT * FROM public.tags;

-- Verificar backup
SELECT COUNT(*) as backup_count FROM tags_backup_$(date +%Y%m%d);

-- =============================================
-- PASO 3: CORRECCIÓN DEL CONSTRAINT
-- =============================================

-- Eliminar constraint problemática
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Verificar que se eliminó
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'tags' 
    AND constraint_type = 'FOREIGN KEY' 
    AND constraint_name LIKE '%created_by%';

-- Agregar nueva constraint correcta que referencia public.users
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- =============================================
-- PASO 4: ACTUALIZAR POLÍTICAS RLS
-- =============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

-- Crear políticas actualizadas que funcionen con public.users
CREATE POLICY "Users can create tags" ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by IN (
            SELECT id FROM public.users 
            WHERE id = (
                SELECT id FROM public.users 
                WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can update their own tags" ON public.tags
    FOR UPDATE
    TO authenticated
    USING (
        created_by IN (
            SELECT id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        created_by IN (
            SELECT id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can delete their own tags" ON public.tags
    FOR DELETE
    TO authenticated
    USING (
        created_by IN (
            SELECT id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- =============================================
-- PASO 5: VERIFICACIÓN POST-MIGRACIÓN
-- =============================================

-- Verificar nueva constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tags'
    AND kcu.column_name = 'created_by';

-- Verificar integridad de datos después de la migración
SELECT 
    COUNT(*) as total_tags,
    COUNT(u.id) as tags_with_valid_creator,
    COUNT(*) - COUNT(u.id) as orphaned_tags
FROM public.tags t
LEFT JOIN public.users u ON t.created_by = u.id;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tags'
ORDER BY policyname;

-- =============================================
-- PASO 6: TEST DE FUNCIONALIDAD
-- =============================================

-- Test 1: Verificar que se puede crear una etiqueta
-- (Este test debe ejecutarse desde la aplicación con un usuario autenticado)
/*
INSERT INTO public.tags (name, color, backgroundColor, created_by)
SELECT 'Test Migration Tag', '#00FF00', '#E6FFE6', id
FROM public.users
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
LIMIT 1;
*/

-- Test 2: Verificar que no se pueden crear etiquetas con created_by inválido
-- (Esto debe fallar con constraint violation)
/*
INSERT INTO public.tags (name, color, backgroundColor, created_by)
VALUES ('Invalid Tag', '#FF0000', '#FFE6E6', gen_random_uuid());
*/

-- =============================================
-- PASO 7: LIMPIEZA (OPCIONAL)
-- =============================================

-- Después de verificar que todo funciona correctamente,
-- se puede eliminar la tabla de backup:
-- DROP TABLE IF EXISTS tags_backup_$(date +%Y%m%d);

-- =============================================
-- PASO 8: MONITOREO CONTINUO
-- =============================================

-- Query para monitorear la salud de la tabla tags
CREATE OR REPLACE VIEW tags_health_check AS
SELECT 
    COUNT(*) as total_tags,
    COUNT(u.id) as tags_with_valid_creator,
    COUNT(*) - COUNT(u.id) as orphaned_tags,
    ROUND(
        (COUNT(u.id)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
    ) as integrity_percentage
FROM public.tags t
LEFT JOIN public.users u ON t.created_by = u.id;

-- Verificar salud actual
SELECT * FROM tags_health_check;

-- =============================================
-- NOTAS IMPORTANTES
-- =============================================

/*
1. Esta migración debe ejecutarse en un momento de bajo tráfico
2. Se recomienda hacer un backup completo de la base de datos antes de ejecutar
3. Después de la migración, probar la funcionalidad de creación de etiquetas
4. Monitorear logs de errores durante las primeras horas post-migración
5. La tabla de backup se puede eliminar después de 24-48 horas de funcionamiento estable

Tiempo estimado de ejecución: 2-5 minutos
Downtime esperado: Mínimo (solo durante la modificación del constraint)
Riesgo: Bajo (se mantiene backup y rollback disponible)
*/

-- =============================================
-- ROLLBACK PLAN (EN CASO DE EMERGENCIA)
-- =============================================

/*
-- Si algo sale mal, ejecutar este rollback:

-- 1. Eliminar constraint nuevo
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- 2. Restaurar constraint original
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- 3. Restaurar datos desde backup si es necesario
TRUNCATE public.tags;
INSERT INTO public.tags SELECT * FROM tags_backup_$(date +%Y%m%d);

-- 4. Restaurar políticas RLS originales
-- (Ver archivo create_tags_table.sql para las políticas originales)
*/