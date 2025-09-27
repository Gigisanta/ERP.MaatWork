-- Limpiar datos inválidos en la tabla contacts antes de aplicar validaciones

-- Corregir emails inválidos
UPDATE contacts 
SET email = NULL 
WHERE email IS NOT NULL 
AND email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Corregir nombres vacíos o solo espacios
UPDATE contacts 
SET name = 'Contacto Sin Nombre' 
WHERE name IS NULL OR trim(name) = '';

-- Corregir valores negativos
UPDATE contacts 
SET value = 0 
WHERE value < 0;

-- Corregir status inválidos
UPDATE contacts 
SET status = 'Prospecto' 
WHERE status NOT IN ('Prospecto', 'Contactado', 'Calificado', 'Propuesta', 'Negociación', 'Cerrado', 'Perdido');

-- Corregir stage inválidos
UPDATE contacts 
SET stage = 'initial' 
WHERE stage NOT IN ('initial', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost');

-- Asegurar que todos los contactos tengan un user_id válido
UPDATE contacts 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE email NOT LIKE '%@test.com' 
    ORDER BY created_at 
    LIMIT 1
)
WHERE user_id IS NULL;

-- Eliminar contactos que no puedan ser corregidos (sin nombre y sin email/teléfono)
DELETE FROM contacts 
WHERE (name IS NULL OR trim(name) = '') 
AND (email IS NULL OR trim(email) = '') 
AND (phone IS NULL OR trim(phone) = '');

-- Limpiar espacios en blanco de campos existentes
UPDATE contacts 
SET 
    name = trim(name),
    email = CASE 
        WHEN email IS NOT NULL THEN trim(lower(email)) 
        ELSE NULL 
    END,
    phone = CASE 
        WHEN phone IS NOT NULL THEN trim(phone) 
        ELSE NULL 
    END,
    company = CASE 
        WHEN company IS NOT NULL THEN trim(company) 
        ELSE NULL 
    END;

-- Limpiar position si la columna existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'position'
    ) THEN
        UPDATE contacts 
        SET position = CASE 
            WHEN position IS NOT NULL THEN trim(position) 
            ELSE NULL 
        END;
    END IF;
END $$;