-- Crear tabla contact_tags para etiquetas personalizables
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Código hexadecimal de color
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id) -- Evitar etiquetas duplicadas por usuario
);

-- Habilitar RLS
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias etiquetas
CREATE POLICY "Users can view their own contact tags" ON contact_tags
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios puedan crear sus propias etiquetas
CREATE POLICY "Users can create their own contact tags" ON contact_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propias etiquetas
CREATE POLICY "Users can update their own contact tags" ON contact_tags
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar sus propias etiquetas
CREATE POLICY "Users can delete their own contact tags" ON contact_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON contact_tags TO authenticated;
GRANT SELECT ON contact_tags TO anon;

-- Crear índices para optimizar consultas
CREATE INDEX idx_contact_tags_user_id ON contact_tags(user_id);
CREATE INDEX idx_contact_tags_name ON contact_tags(name);

-- Insertar etiquetas predeterminadas con colorimetría Cactus
-- Estas se crearán automáticamente para cada usuario cuando sea necesario