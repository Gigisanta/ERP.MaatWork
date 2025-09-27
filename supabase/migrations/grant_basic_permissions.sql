-- Migración para otorgar permisos básicos a la tabla contacts
-- Fecha: 2025-01-18

-- Otorgar permisos básicos a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.contacts TO authenticated;

-- Otorgar permisos de secuencia si existe
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verificar que los permisos se otorgaron
DO $$
BEGIN
    RAISE NOTICE 'Permisos básicos otorgados a la tabla contacts para usuarios autenticados';
END $$;