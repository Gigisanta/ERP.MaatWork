-- Limpiar datos de teléfono inválidos

-- Eliminar teléfonos que son muy cortos o contienen solo espacios/caracteres especiales
UPDATE contacts 
SET phone = NULL 
WHERE phone IS NOT NULL 
AND (length(trim(phone)) < 8 OR trim(phone) ~ '^[^0-9+()-]*$');

-- Limpiar teléfonos que solo contienen espacios
UPDATE contacts 
SET phone = NULL 
WHERE phone IS NOT NULL 
AND trim(phone) = '';

-- Mostrar información sobre los teléfonos que se van a limpiar
SELECT 
    'Teléfonos a limpiar:' as info,
    COUNT(*) as cantidad
FROM contacts 
WHERE phone IS NOT NULL 
AND length(trim(phone)) < 8;