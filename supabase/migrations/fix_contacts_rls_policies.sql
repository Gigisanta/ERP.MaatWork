-- Fix RLS policies for contacts table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
DROP POLICY IF EXISTS "Advisors can view assigned contacts" ON contacts;
DROP POLICY IF EXISTS "Managers can view team contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON contacts;

-- Create comprehensive RLS policies
-- Policy for SELECT operations
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    -- User can see their own contacts
    user_id = auth.uid()
    OR
    -- User can see contacts assigned to them
    assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Managers can see contacts from their team (same role hierarchy)
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('manager', 'admin')
      )
      AND (
        user_id IN (
          SELECT up2.user_id FROM user_profiles up2
          WHERE up2.role = 'advisor'
        )
        OR assigned_to IN (
          SELECT u.email FROM auth.users u
          JOIN user_profiles up3 ON u.id = up3.user_id
          WHERE up3.role = 'advisor'
        )
      )
    )
    OR
    -- Admins can see all contacts
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Policy for INSERT operations
CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    -- User can only create contacts for themselves
    user_id = auth.uid()
    OR
    -- Managers and admins can create contacts for advisors
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('manager', 'admin')
      )
      AND (
        user_id IN (
          SELECT up2.user_id FROM user_profiles up2
          WHERE up2.role = 'advisor'
        )
        OR user_id = auth.uid()
      )
    )
  );

-- Policy for UPDATE operations
CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    -- Same conditions as SELECT
    user_id = auth.uid()
    OR
    assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('manager', 'admin')
      )
      AND (
        user_id IN (
          SELECT up2.user_id FROM user_profiles up2
          WHERE up2.role = 'advisor'
        )
        OR assigned_to IN (
          SELECT u.email FROM auth.users u
          JOIN user_profiles up3 ON u.id = up3.user_id
          WHERE up3.role = 'advisor'
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    -- Same conditions as INSERT
    user_id = auth.uid()
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('manager', 'admin')
      )
      AND (
        user_id IN (
          SELECT up2.user_id FROM user_profiles up2
          WHERE up2.role = 'advisor'
        )
        OR user_id = auth.uid()
      )
    )
  );

-- Policy for DELETE operations
CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    -- Only admins can delete contacts
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
    OR
    -- Users can delete their own contacts
    user_id = auth.uid()
  );

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE ON contacts TO authenticated;
GRANT SELECT ON contacts TO anon;

-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE contacts IS 'Contacts table with comprehensive RLS policies for role-based access control';