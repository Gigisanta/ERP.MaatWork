-- Create contacts and contact_status_history tables with RLS for per-user data isolation

-- Enable pgcrypto for gen_random_uuid if not enabled
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Prospecto',
  stage TEXT DEFAULT 'initial',
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value NUMERIC(12,2) DEFAULT 0,
  notes JSONB DEFAULT '[]',
  last_contact_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact status history
CREATE TABLE IF NOT EXISTS public.contact_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact_name TEXT,
  contact_email TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON public.contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_history_contact_id ON public.contact_status_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_changed_by ON public.contact_status_history(changed_by);

-- RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_status_history ENABLE ROW LEVEL SECURITY;

-- Basic per-user policies: users can manage their own contacts
DROP POLICY IF EXISTS contacts_own_select ON public.contacts;
DROP POLICY IF EXISTS contacts_own_modify ON public.contacts;
CREATE POLICY contacts_own_select ON public.contacts
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY contacts_own_modify ON public.contacts
  FOR ALL
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- History policies: user can insert their own changes; view history for their contacts
DROP POLICY IF EXISTS contact_history_insert ON public.contact_status_history;
DROP POLICY IF EXISTS contact_history_select ON public.contact_status_history;
CREATE POLICY contact_history_insert ON public.contact_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

CREATE POLICY contact_history_select ON public.contact_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_status_history.contact_id
      AND c.assigned_to = auth.uid()
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT ON public.contact_status_history TO authenticated;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



