-- Add stage column to existing contacts table
-- This migration adds the missing 'stage' column that was referenced in the code

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'initial';

-- Create index for the new stage column
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON public.contacts(stage);

-- Update existing contacts to have the default stage value
UPDATE public.contacts 
SET stage = 'initial' 
WHERE stage IS NULL;