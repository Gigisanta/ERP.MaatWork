-- Migración para crear tabla notion_pages_map y configurar políticas RLS
-- Fecha: 2024-01-20
-- Propósito: Almacenar mapeo de usuarios a páginas de Notion personalizadas

-- Crear tabla notion_pages_map
CREATE TABLE IF NOT EXISTS public.notion_pages_map (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notion_page_url TEXT NOT NULL,
    notion_page_id TEXT,
    notion_workspace_id TEXT,
    encrypted_access_token TEXT, -- Para funcionalidad OAuth PRO
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_notion_mapping UNIQUE(user_id),
    CONSTRAINT valid_notion_url CHECK (
        notion_page_url ~ '^https://[a-zA-Z0-9\-]+\.notion\.(site|so)/.*$'
    )
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_user_id ON public.notion_pages_map(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_active ON public.notion_pages_map(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_updated_at ON public.notion_pages_map(updated_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.notion_pages_map ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios registros
CREATE POLICY "Users can view own notion pages" ON public.notion_pages_map
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios registros
CREATE POLICY "Users can insert own notion pages" ON public.notion_pages_map
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios registros
CREATE POLICY "Users can update own notion pages" ON public.notion_pages_map
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios registros
CREATE POLICY "Users can delete own notion pages" ON public.notion_pages_map
    FOR DELETE USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notion_pages_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER trigger_update_notion_pages_map_updated_at
    BEFORE UPDATE ON public.notion_pages_map
    FOR EACH ROW
    EXECUTE FUNCTION update_notion_pages_map_updated_at();

-- Otorgar permisos a roles autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notion_pages_map TO authenticated;
GRANT SELECT ON public.notion_pages_map TO anon;

-- Comentarios para documentación
COMMENT ON TABLE public.notion_pages_map IS 'Mapeo de usuarios a páginas de Notion personalizadas para CRM';
COMMENT ON COLUMN public.notion_pages_map.user_id IS 'ID del usuario de Supabase Auth';
COMMENT ON COLUMN public.notion_pages_map.notion_page_url IS 'URL completa de la página de Notion del usuario';
COMMENT ON COLUMN public.notion_pages_map.notion_page_id IS 'ID específico de la página de Notion (opcional)';
COMMENT ON COLUMN public.notion_pages_map.notion_workspace_id IS 'ID del workspace de Notion (para OAuth)';
COMMENT ON COLUMN public.notion_pages_map.encrypted_access_token IS 'Token de acceso de Notion cifrado (funcionalidad PRO)';
COMMENT ON COLUMN public.notion_pages_map.is_active IS 'Indica si la configuración está activa';

-- Insertar datos de ejemplo para testing (opcional - comentado por defecto)
/*
INSERT INTO public.notion_pages_map (user_id, notion_page_url, notion_page_id) VALUES 
(
    (SELECT id FROM auth.users WHERE email = 'admin@cactus.com' LIMIT 1),
    'https://giolivosantarelli.notion.site/ebd/27296d1d68a3800e9860d8d8bc746181',
    '27296d1d68a3800e9860d8d8bc746181'
);
*/

-- Verificar que la migración se aplicó correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notion_pages_map') THEN
        RAISE NOTICE 'Tabla notion_pages_map creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: Tabla notion_pages_map no fue creada';
    END IF;
END $$;