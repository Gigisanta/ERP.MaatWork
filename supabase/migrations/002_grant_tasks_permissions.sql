-- Grant permissions for tasks table to anon and authenticated roles

-- Grant SELECT, INSERT, UPDATE, DELETE permissions to authenticated users
GRANT ALL PRIVILEGES ON tasks TO authenticated;

-- Grant SELECT permission to anonymous users (if needed for public access)
GRANT SELECT ON tasks TO anon;

-- Verify current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'tasks' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;