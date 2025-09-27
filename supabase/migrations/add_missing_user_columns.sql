-- Agregar columnas faltantes a la tabla users para compatibilidad con pruebas

-- Agregar columna 'name' (alias para full_name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR;

-- Actualizar valores existentes de name basándose en full_name
UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;

-- Agregar columna 'active' (estado activo del usuario)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Agregar columna 'status' (estado del usuario)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';

-- Agregar constraint para status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_status_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check 
      CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
  END IF;
END $$;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Comentarios para documentación
COMMENT ON COLUMN users.name IS 'Nombre del usuario (alias para full_name)';
COMMENT ON COLUMN users.active IS 'Indica si el usuario está activo';
COMMENT ON COLUMN users.status IS 'Estado del usuario: active, inactive, pending, suspended';