-- Sistema de Gestión de Notas y Comentarios CRM
-- Migración básica para crear las tablas principales

-- Crear tabla de notas
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 2000),
    type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'general')),
    is_private BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC) WHERE deleted_at IS NULL;

-- Tabla de adjuntos
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size <= 10485760),
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de etiquetas
CREATE TABLE IF NOT EXISTS note_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#16a34a',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, tag_name)
);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

-- Política básica: usuarios autenticados pueden gestionar sus propias notas
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
CREATE POLICY "Users can manage their own notes" ON notes
    FOR ALL USING (auth.uid() = author_id);

-- Política básica para adjuntos
DROP POLICY IF EXISTS "Users can manage their attachments" ON note_attachments;
CREATE POLICY "Users can manage their attachments" ON note_attachments
    FOR ALL USING (
        note_id IN (SELECT id FROM notes WHERE author_id = auth.uid())
    );

-- Política básica para etiquetas
DROP POLICY IF EXISTS "Users can manage their tags" ON note_tags;
CREATE POLICY "Users can manage their tags" ON note_tags
    FOR ALL USING (
        note_id IN (SELECT id FROM notes WHERE author_id = auth.uid())
    );

-- Otorgar permisos básicos
GRANT ALL PRIVILEGES ON notes TO authenticated;
GRANT ALL PRIVILEGES ON note_attachments TO authenticated;
GRANT ALL PRIVILEGES ON note_tags TO authenticated;

GRANT SELECT ON notes TO anon;
GRANT SELECT ON note_attachments TO anon;
GRANT SELECT ON note_tags TO anon;

-- Comentarios
COMMENT ON TABLE notes IS 'Tabla principal para notas y comentarios del CRM';
COMMENT ON TABLE note_attachments IS 'Archivos adjuntos de las notas';
COMMENT ON TABLE note_tags IS 'Etiquetas para categorizar notas';