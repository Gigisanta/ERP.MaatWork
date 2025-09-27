-- =============================================
-- Migration: Add updated_at column to tags table
-- Date: 2025-01-17
-- Description: Adds missing updated_at column and trigger
-- =============================================

-- Add updated_at column to tags table
ALTER TABLE public.tags 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have updated_at = created_at
UPDATE public.tags 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after setting values
ALTER TABLE public.tags 
ALTER COLUMN updated_at SET NOT NULL;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tags table
DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Verify the changes
DO $$
BEGIN
    -- Check if updated_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tags' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'Migration failed: updated_at column was not added to tags table';
    END IF;
    
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND event_object_table = 'tags' 
        AND trigger_name = 'update_tags_updated_at'
    ) THEN
        RAISE EXCEPTION 'Migration failed: update_tags_updated_at trigger was not created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: updated_at column and trigger added to tags table';
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO anon;