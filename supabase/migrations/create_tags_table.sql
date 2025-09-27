-- Crear tabla tags para el sistema de etiquetas
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    backgroundColor TEXT NOT NULL DEFAULT '#EFF6FF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Users can view all tags" ON public.tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Users can create tags" ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Política para permitir actualización solo al creador
CREATE POLICY "Users can update their own tags" ON public.tags
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Política para permitir eliminación solo al creador
CREATE POLICY "Users can delete their own tags" ON public.tags
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Otorgar permisos a los roles anon y authenticated
GRANT SELECT ON public.tags TO anon;
GRANT ALL PRIVILEGES ON public.tags TO authenticated;

-- Crear índice para mejorar rendimiento en búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);

-- Comentarios para documentación
COMMENT ON TABLE public.tags IS 'Tabla para almacenar las etiquetas del sistema CRM';
COMMENT ON COLUMN public.tags.id IS 'Identificador único de la etiqueta';
COMMENT ON COLUMN public.tags.name IS 'Nombre único de la etiqueta';
COMMENT ON COLUMN public.tags.color IS 'Color del texto de la etiqueta en formato hexadecimal';
COMMENT ON COLUMN public.tags.backgroundColor IS 'Color de fondo de la etiqueta en formato hexadecimal';
COMMENT ON COLUMN public.tags.created_at IS 'Fecha y hora de creación de la etiqueta';
COMMENT ON COLUMN public.tags.created_by IS 'ID del usuario que creó la etiqueta';