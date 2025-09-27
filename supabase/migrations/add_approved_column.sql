-- Agregar columna 'approved' faltante a la tabla users

-- Agregar columna 'approved' (alias para is_approved)
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Actualizar valores existentes de approved basándose en is_approved
UPDATE users SET approved = is_approved WHERE approved IS NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);

-- Comentario para documentación
COMMENT ON COLUMN users.approved IS 'Indica si el usuario está aprobado (alias para is_approved)';