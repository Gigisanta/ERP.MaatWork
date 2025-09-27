-- Verificar y otorgar permisos para las tablas contacts y contact_tags

-- Otorgar permisos a la tabla contacts
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT ON contacts TO anon;

-- Otorgar permisos a la tabla contact_tags
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_tags TO authenticated;
GRANT SELECT ON contact_tags TO anon;

-- Verificar permisos otorgados (solo para referencia)
-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('contacts', 'contact_tags') 
--   AND grantee IN ('anon', 'authenticated') 
-- ORDER BY table_name, grantee;