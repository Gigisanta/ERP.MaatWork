-- =============================================
-- MIGRACIÓN SIMPLE: Corrección Foreign Key Constraint
-- =============================================
-- Estrategia: Eliminar constraint, limpiar datos, recrear constraint
-- Fecha: 2025-01-17
-- Archivo: 20250117000003_fix_tags_simple.sql

BEGIN;

-- Crear tabla de respaldo
CREATE TABLE IF NOT EXISTS tags_backup_simple AS 
SELECT * FROM public.tags;

-- Eliminar el constraint problemático
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Limpiar datos huérfanos
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
        -- Actualizar tags huérfanos
        UPDATE public.tags 
        SET created_by = first_user_id
        WHERE created_by IS NULL 
           OR created_by NOT IN (SELECT id FROM public.users);
    ELSE
        -- Si no hay usuarios, eliminar tags huérfanos
        DELETE FROM public.tags 
        WHERE created_by IS NULL 
           OR created_by NOT IN (SELECT id FROM public.users);
    END IF;
END $$;

-- Crear nuevo constraint correcto
ALTER TABLE public.tags 
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

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

COMMIT;