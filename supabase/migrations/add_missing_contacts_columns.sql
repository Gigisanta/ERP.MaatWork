-- Agregar columnas faltantes a la tabla contacts
-- Estas columnas son requeridas por las pruebas y funcionalidades del sistema

-- Agregar columna user_id para asociar contactos con usuarios
ALTER TABLE contacts 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Agregar columna position para almacenar la posición del contacto
ALTER TABLE contacts 
ADD COLUMN position VARCHAR(255);

-- Crear índice para mejorar el rendimiento de consultas por user_id
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- Crear índice para position si es necesario para búsquedas
CREATE INDEX IF NOT EXISTS idx_contacts_position ON contacts(position);

-- Actualizar contactos existentes para asignarlos al primer usuario disponible
-- (esto es temporal para datos existentes)
UPDATE contacts 
SET user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email NOT LIKE '%@test.com' 
    LIMIT 1
)
WHERE user_id IS NULL;

-- Agregar comentarios para documentar las nuevas columnas
COMMENT ON COLUMN contacts.user_id IS 'ID del usuario propietario del contacto';
COMMENT ON COLUMN contacts.position IS 'Posición o cargo del contacto en su empresa';