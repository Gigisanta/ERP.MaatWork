-- AUM imports staging and audit tables
-- AI_DECISION: Introducir tablas de staging/auditoría para importaciones manuales
-- Justificación: Evitar modificar tablas canónicas y habilitar flujos de conciliación seguros
-- Impacto: Nuevas tablas y 
-- índices sin cambios en relaciones existentes

CREATE TABLE IF NOT EXISTS "aum_import_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "broker" text NOT NULL,
  "original_filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "uploaded_by_user_id" uuid NOT NULL,
  "status" text NOT NULL,
  "total_parsed" integer NOT NULL DEFAULT 0,
  "total_matched" integer NOT NULL DEFAULT 0,
  "total_unmatched" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "aum_import_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "aum_import_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_id" uuid NOT NULL,
  "raw" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "account_number" text,
  "holder_name" text,
  "advisor_raw" text,
  "matched_contact_id" uuid,
  "matched_user_id" uuid,
  "match_status" text NOT NULL DEFAULT 'unmatched',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "aum_import_rows_file_fkey" FOREIGN KEY ("file_id") REFERENCES "aum_import_files"("id") ON DELETE CASCADE,
  CONSTRAINT "aum_import_rows_contact_fkey" FOREIGN KEY ("matched_contact_id") REFERENCES "contacts"("id"),
  CONSTRAINT "aum_import_rows_user_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "idx_aum_rows_account" ON "aum_import_rows" ("account_number");
CREATE INDEX IF NOT EXISTS "idx_aum_rows_file" ON "aum_import_rows" ("file_id");


