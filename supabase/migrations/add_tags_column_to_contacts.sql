-- Agregar columna tags a la tabla contacts
-- Esta columna almacenará las etiquetas como un array JSON

ALTER TABLE public.contacts 
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;

-- Agregar comentario para documentar la columna
COMMENT ON COLUMN public.contacts.tags IS 'Etiquetas del contacto almacenadas como array JSON';

-- Crear índice para mejorar el rendimiento de consultas sobre tags
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN (tags);

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'tags';