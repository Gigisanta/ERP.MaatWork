-- Grant permissions for teams table
GRANT SELECT, INSERT, UPDATE, DELETE ON teams TO authenticated;
GRANT SELECT ON teams TO anon;

-- Verify permissions for teams table
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'teams' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;