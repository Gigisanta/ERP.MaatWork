-- Migration: Remove initial setup functionality completely
-- This removes has_existing_admins function and related policies

-- Drop the has_existing_admins function completely
DROP FUNCTION IF EXISTS public.has_existing_admins() CASCADE;

-- Drop policies that depend on initial setup logic
DROP POLICY IF EXISTS "allow_initial_admin_setup" ON public.users;
DROP POLICY IF EXISTS "allow_initial_admin_creation" ON public.users;
DROP POLICY IF EXISTS "users_initial_admin_creation" ON public.users;
DROP POLICY IF EXISTS "comprehensive_users_policy" ON public.users;
DROP POLICY IF EXISTS "allow_initial_approval_creation" ON public.approvals;

-- Drop existing policies that we will recreate
DROP POLICY IF EXISTS "users_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "admin_manage_all_users" ON public.users;
DROP POLICY IF EXISTS "allow_advisor_registration" ON public.users;
DROP POLICY IF EXISTS "allow_approval_requests" ON public.approvals;
DROP POLICY IF EXISTS "view_own_approvals_or_admin" ON public.approvals;
DROP POLICY IF EXISTS "admin_manage_approvals" ON public.approvals;

-- Create simplified policies without initial setup logic
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "admin_manage_all_users" ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin' 
      AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin' 
      AND is_approved = true
    )
  );

-- Allow advisor registration (no admin creation through registration)
CREATE POLICY "allow_advisor_registration" ON public.users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (role = 'advisor');

-- Policies for approvals table
CREATE POLICY "allow_approval_requests" ON public.approvals
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "view_own_approvals_or_admin" ON public.approvals
  FOR SELECT
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin' 
      AND is_approved = true
    )
  );

CREATE POLICY "admin_manage_approvals" ON public.approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin' 
      AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin' 
      AND is_approved = true
    )
  );

-- Comments
COMMENT ON POLICY "allow_advisor_registration" ON public.users IS 'Allows only advisor registration, no admin creation';
COMMENT ON POLICY "admin_manage_all_users" ON public.users IS 'Gives full access to approved admin users';