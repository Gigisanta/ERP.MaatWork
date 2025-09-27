-- Crear tabla de deals/oportunidades para el CRM
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (length(TRIM(BOTH FROM title)) > 0),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    contact_name VARCHAR(255),
    amount DECIMAL(12,2) DEFAULT 0 CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    stage VARCHAR(50) DEFAULT 'prospecting' CHECK (
        stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')
    ),
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    actual_close_date DATE,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para mejorar performance
    CONSTRAINT deals_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);

-- Habilitar RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Crear política RLS para que usuarios solo vean sus propios deals
CREATE POLICY "Users can manage own deals" ON deals
    FOR ALL USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deals_updated_at 
    BEFORE UPDATE ON deals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Otorgar permisos
GRANT ALL PRIVILEGES ON deals TO authenticated;
GRANT SELECT ON deals TO anon;

-- Comentario en la tabla
COMMENT ON TABLE deals IS 'Tabla de oportunidades/deals del CRM con RLS habilitado';
COMMENT ON COLUMN deals.user_id IS 'ID del usuario propietario del deal';
COMMENT ON COLUMN deals.contact_id IS 'Referencia al contacto asociado (opcional)';
COMMENT ON COLUMN deals.stage IS 'Etapa actual del deal en el pipeline de ventas';
COMMENT ON COLUMN deals.probability IS 'Probabilidad de cierre (0-100%)';
COMMENT ON COLUMN deals.tags IS 'Etiquetas del deal almacenadas como array JSON';