-- AUM import rows conflict tracking fields
-- AI_DECISION: Add duplicate detection and preferred row marking
-- Justificación: Enable manual resolution of duplicate accounts across imports
-- Impacto: New fields for conflict tracking without changing existing data

ALTER TABLE "aum_import_rows" 
  ADD COLUMN IF NOT EXISTS "is_preferred" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "conflict_detected" boolean NOT NULL DEFAULT false;





