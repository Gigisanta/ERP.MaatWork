-- Agregar validaciones y constraints a la tabla contacts
-- Estas validaciones aseguran la integridad de los datos

-- Hacer que el campo email sea requerido cuando se proporciona
ALTER TABLE contacts 
ADD CONSTRAINT contacts_email_format_check 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar que el teléfono tenga un formato válido cuando se proporciona
ALTER TABLE contacts 
ADD CONSTRAINT contacts_phone_format_check 
CHECK (phone IS NULL OR length(trim(phone)) >= 8);

-- Validar que el nombre no esté vacío
ALTER TABLE contacts 
ADD CONSTRAINT contacts_name_not_empty_check 
CHECK (length(trim(name)) > 0);

-- Validar que el valor sea no negativo
ALTER TABLE contacts 
ADD CONSTRAINT contacts_value_non_negative_check 
CHECK (value >= 0);

-- Validar que el status tenga valores válidos
ALTER TABLE contacts 
ADD CONSTRAINT contacts_status_valid_check 
CHECK (status IN ('Prospecto', 'Contactado', 'Calificado', 'Propuesta', 'Negociación', 'Cerrado', 'Perdido'));

-- Validar que el stage tenga valores válidos
ALTER TABLE contacts 
ADD CONSTRAINT contacts_stage_valid_check 
CHECK (stage IN ('initial', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost'));

-- Asegurar que user_id no sea nulo para nuevos contactos
-- (permitir NULL temporalmente para datos existentes)
DO $$
BEGIN
    -- Solo agregar la constraint si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'contacts_user_id_required' 
        AND table_name = 'contacts'
    ) THEN
        -- Primero actualizar registros existentes sin user_id
        UPDATE contacts 
        SET user_id = (
            SELECT id FROM auth.users 
            WHERE email NOT LIKE '%@test.com' 
            LIMIT 1
        )
        WHERE user_id IS NULL;
        
        -- Luego agregar la constraint
        ALTER TABLE contacts 
        ADD CONSTRAINT contacts_user_id_required 
        CHECK (user_id IS NOT NULL);
    END IF;
END $$;

-- Crear función para validar datos antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_contact_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que al menos email o teléfono esté presente
    IF (NEW.email IS NULL OR trim(NEW.email) = '') AND 
       (NEW.phone IS NULL OR trim(NEW.phone) = '') THEN
        RAISE EXCEPTION 'Al menos email o teléfono debe ser proporcionado';
    END IF;
    
    -- Limpiar espacios en blanco
    NEW.name = trim(NEW.name);
    IF NEW.email IS NOT NULL THEN
        NEW.email = trim(lower(NEW.email));
    END IF;
    IF NEW.phone IS NOT NULL THEN
        NEW.phone = trim(NEW.phone);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validación
DROP TRIGGER IF EXISTS validate_contact_trigger ON contacts;
CREATE TRIGGER validate_contact_trigger
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION validate_contact_data();