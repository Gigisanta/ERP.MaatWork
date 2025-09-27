-- Agregar columna 'password' a la tabla users para compatibilidad con pruebas

-- Agregar columna 'password' (hash de contraseña)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_password ON users(password);

-- Comentario para documentación
COMMENT ON COLUMN users.password IS 'Hash de la contraseña del usuario para autenticación local';