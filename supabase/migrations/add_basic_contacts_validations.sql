-- Agregar validaciones básicas a la tabla contacts
-- Versión simplificada para evitar conflictos con datos existentes

-- Validar que el nombre no esté vacío (solo para nuevos registros)
ALTER TABLE contacts 
ADD CONSTRAINT contacts_name_not_empty_check 
CHECK (length(trim(name)) > 0);

-- Validar que el valor sea no negativo
ALTER TABLE contacts 
ADD CONSTRAINT contacts_value_non_negative_check 
CHECK (value >= 0);

-- Crear función para validar datos antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_contact_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Limpiar espacios en blanco
    NEW.name = trim(NEW.name);
    IF NEW.email IS NOT NULL THEN
        NEW.email = trim(lower(NEW.email));
    END IF;
    IF NEW.phone IS NOT NULL THEN
        NEW.phone = trim(NEW.phone);
    END IF;
    
    -- Validar email básico si se proporciona
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Formato de email inválido: %', NEW.email;
        END IF;
    END IF;
    
    -- Validar que el nombre no esté vacío
    IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
        RAISE EXCEPTION 'El nombre del contacto es requerido';
    END IF;
    
    -- Validar que al menos email o teléfono esté presente
    IF (NEW.email IS NULL OR trim(NEW.email) = '') AND 
       (NEW.phone IS NULL OR trim(NEW.phone) = '') THEN
        RAISE EXCEPTION 'Al menos email o teléfono debe ser proporcionado';
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