CREATE TABLE IF NOT EXISTS "matching_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matching_audit_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_ids" jsonb NOT NULL,
	"comment" text NOT NULL,
	"resolved_by_user_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stg_aum_madre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"actualizado" date,
	"id_cuenta" text,
	"comitente" integer,
	"cuotapartista" integer,
	"descripcion" text,
	"asesor" text,
	"mail" text,
	"fecha_alta" date,
	"es_juridica" boolean,
	"asesor_texto" text,
	"equipo" text,
	"unidad" text,
	"arancel" text,
	"esquema_comisiones" text,
	"referidor" text,
	"negocio" text,
	"primer_fondeo" date,
	"activo" boolean,
	"activo_ult_12_meses" boolean,
	"aum_en_dolares" numeric(18, 6),
	"bolsa_arg" numeric(18, 6),
	"fondos_arg" numeric(18, 6),
	"bolsa_bci" numeric(18, 6),
	"pesos" numeric(18, 6),
	"mep" numeric(18, 6),
	"cable" numeric(18, 6),
	"cv7000" numeric(18, 6),
	"cv10000" numeric(18, 6),
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contacts_stage";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contacts_sla_status";--> statement-breakpoint
ALTER TABLE "dim_client" ADD COLUMN "descubierto_en_madre" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dim_client" ADD COLUMN "descubierto_en_mensual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matching_audit" ADD COLUMN "resolution_comment" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_resolutions" ADD CONSTRAINT "matching_resolutions_matching_audit_id_matching_audit_id_fk" FOREIGN KEY ("matching_audit_id") REFERENCES "public"."matching_audit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_resolutions" ADD CONSTRAINT "matching_resolutions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stg_aum_madre" ADD CONSTRAINT "stg_aum_madre_run_id_integration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."integration_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matching_resolutions_audit" ON "matching_resolutions" USING btree ("matching_audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matching_resolutions_user" ON "matching_resolutions" USING btree ("resolved_by_user_id");--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "lifecycle_stage";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "sla_status";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "sla_due_at";--> statement-breakpoint
ALTER TABLE "pipeline_stages" DROP COLUMN IF EXISTS "sla_hours";