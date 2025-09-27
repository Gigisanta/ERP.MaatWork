-- Crear tabla para almacenar contactos reales
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Prospecto',
  assigned_to VARCHAR(255),
  value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  notes JSONB DEFAULT '[]'::jsonb
);

-- Crear tabla para historial de cambios de estado
CREATE TABLE IF NOT EXISTS contact_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Crear tabla para métricas de conversión mensuales
CREATE TABLE IF NOT EXISTS monthly_conversion_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  user_id VARCHAR(255),
  total_contacts INTEGER DEFAULT 0,
  converted_to_client INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  average_conversion_time DECIMAL(8,2) DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month, user_id)
);

-- Crear tabla para métricas históricas generales
CREATE TABLE IF NOT EXISTS historical_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  date DATE NOT NULL,
  total_contacts INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  converted_contacts INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  pipeline_value DECIMAL(12,2) DEFAULT 0,
  closed_value DECIMAL(12,2) DEFAULT 0,
  average_deal_size DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_status_history_contact_id ON contact_status_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_status_history_changed_at ON contact_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_monthly_metrics_year_month ON monthly_conversion_metrics(year, month);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_date ON historical_metrics(date);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_user_date ON historical_metrics(user_id, date);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en contacts
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para registrar cambios de estado automáticamente
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO contact_status_history (contact_id, from_status, to_status, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para registrar cambios de estado
CREATE TRIGGER log_contact_status_change AFTER UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Habilitar RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_conversion_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (permitir todo por ahora)
CREATE POLICY "Allow all operations on contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations on contact_status_history" ON contact_status_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on monthly_conversion_metrics" ON monthly_conversion_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations on historical_metrics" ON historical_metrics FOR ALL USING (true);