-- Approvals hardening: ensure table, columns, indexes, RLS and grants exist

-- Create approvals table if missing
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('manager','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  comments TEXT,
  priority TEXT CHECK (priority IN ('high','medium','low')),
  request_type TEXT CHECK (request_type IN ('role_upgrade','new_registration')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Columns (idempotent)
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_user_id ON public.approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON public.approvals(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approvals_update_timestamp ON public.approvals;
CREATE TRIGGER approvals_update_timestamp BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Policies (simple defaults)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='approvals' AND policyname='approvals_insert_authenticated'
  ) THEN
    CREATE POLICY approvals_insert_authenticated ON public.approvals
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='approvals' AND policyname='approvals_select_own_or_admin'
  ) THEN
    CREATE POLICY approvals_select_own_or_admin ON public.approvals
      FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR (
          EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager') AND u.is_approved = true
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='approvals' AND policyname='approvals_update_admins'
  ) THEN
    CREATE POLICY approvals_update_admins ON public.approvals
      FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_approved = true)
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_approved = true)
      );
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT ON public.approvals TO authenticated;
GRANT UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;



