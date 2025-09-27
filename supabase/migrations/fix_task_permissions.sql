-- Check current permissions for task-related tables
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('task_assignments', 'tasks', 'users') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Grant permissions for task_assignments table
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignments TO authenticated;
GRANT SELECT ON task_assignments TO anon;

-- Grant permissions for tasks table
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT ON tasks TO anon;

-- Grant permissions for users table (if not already granted)
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Verify permissions after granting
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('task_assignments', 'tasks', 'users') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;