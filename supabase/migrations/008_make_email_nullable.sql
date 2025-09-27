-- Migración para hacer la columna email nullable en la tabla contacts
-- Esto resuelve el conflicto entre migraciones donde email estaba definido como NOT NULL

-- Hacer la columna email nullable
ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;

-- Agregar comentario para documentar el cambio
COMMENT ON COLUMN contacts.email IS 'Email del contacto (opcional)';

-- Verificar que la migración se aplicó correctamente
DO $$
BEGIN
    -- Verificar que la columna email ahora es nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE 'Migración exitosa: La columna email ahora es nullable';
    ELSE
        RAISE EXCEPTION 'Error en migración: La columna email sigue siendo NOT NULL';
    END IF;
END $$;