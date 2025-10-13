-- Migration: Add missing fields for comparison system
-- Generated at: 2025-01-27

-- Add ausentesDetectados field to auditoria_cargas
ALTER TABLE "auditoria_cargas" ADD COLUMN "ausentes_detectados" integer DEFAULT 0 NOT NULL;

-- Add requiereConfirmacionAsesor field to diff_detalle
ALTER TABLE "diff_detalle" ADD COLUMN "requiere_confirmacion_asesor" boolean DEFAULT false NOT NULL;

-- Add index for requiere_confirmacion_asesor
CREATE INDEX IF NOT EXISTS "idx_diff_detalle_confirmacion" ON "diff_detalle" ("requiere_confirmacion_asesor");

-- Make some fields nullable in diff_detalle for ausentes (they don't have new values)
ALTER TABLE "diff_detalle" ALTER COLUMN "comitente_nuevo" DROP NOT NULL;
ALTER TABLE "diff_detalle" ALTER COLUMN "cuotapartista_nuevo" DROP NOT NULL;
ALTER TABLE "diff_detalle" ALTER COLUMN "descripcion_nueva" DROP NOT NULL;

-- Update tipo enum to include 'ausente'
-- Note: PostgreSQL doesn't have ENUM constraints on text fields, so this is just documentation
-- The application logic will handle the 'ausente' type



