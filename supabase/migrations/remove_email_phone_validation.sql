-- Eliminar validaciones obligatorias de email y teléfono
-- Los campos email y teléfono deben ser opcionales

-- Eliminar trigger existente que valida email/teléfono obligatorio
DROP TRIGGER IF EXISTS validate_contact_trigger ON contacts;

-- Eliminar función de validación que requiere email o teléfono
DROP FUNCTION IF EXISTS validate_contact_data();

-- Crear nueva función de validación sin requerir email/teléfono
CREATE OR REPLACE FUNCTION validate_contact_data_optional()
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
    
    -- Validar email básico si se proporciona (opcional)
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Formato de email inválido: %', NEW.email;
        END IF;
    END IF;
    
    -- Validar que el nombre no esté vacío (único campo obligatorio)
    IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
        RAISE EXCEPTION 'El nombre del contacto es requerido';
    END IF;
    
    -- NO validar email/teléfono obligatorio - ambos son opcionales
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear nuevo trigger con validación opcional
CREATE TRIGGER validate_contact_optional_trigger
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION validate_contact_data_optional();

-- Comentario de documentación
COMMENT ON FUNCTION validate_contact_data_optional() IS 'Validación de contactos donde solo el nombre es obligatorio, email y teléfono son opcionales';