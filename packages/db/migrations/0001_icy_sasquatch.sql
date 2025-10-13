CREATE TABLE IF NOT EXISTS "dim_advisor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_persona_asesor" integer,
	"asesor_norm" text NOT NULL,
	"cuil_asesor" text,
	"equipo" text,
	"unidad" text,
	"arancel" text,
	"esquema_comisiones" text,
	"referidor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dim_advisor_id_persona_asesor_unique" UNIQUE("id_persona_asesor")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dim_client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comitente" integer NOT NULL,
	"cuotapartista" integer NOT NULL,
	"cuenta_norm" text NOT NULL,
	"idcuenta" text,
	"es_juridica" boolean,
	"fecha_alta" date,
	"activo" boolean,
	"primer_fondeo" date,
	"equipo" text,
	"unidad" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_aum_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"id_client" uuid NOT NULL,
	"id_advisor_owner" uuid,
	"aum_usd" numeric(18, 6) NOT NULL,
	"bolsa_arg" numeric(18, 6) DEFAULT 0,
	"fondos_arg" numeric(18, 6) DEFAULT 0,
	"bolsa_bci" numeric(18, 6) DEFAULT 0,
	"pesos" numeric(18, 6) DEFAULT 0,
	"mep" numeric(18, 6) DEFAULT 0,
	"cable" numeric(18, 6) DEFAULT 0,
	"cv7000" numeric(18, 6) DEFAULT 0,
	"cv10000" numeric(18, 6) DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_commission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"op_id" text NOT NULL,
	"fecha" date NOT NULL,
	"id_client" uuid NOT NULL,
	"id_advisor_benef" uuid,
	"ticker" text,
	"tipo" text,
	"cantidad" numeric(28, 8),
	"precio" numeric(18, 6),
	"comision_usd" numeric(18, 6) NOT NULL,
	"comision_usd_alloc" numeric(18, 6) NOT NULL,
	"iva_ars" numeric(18, 6),
	"porcentaje_alloc" numeric(7, 4),
	"equipo" text,
	"unidad" text,
	"owner_vs_benef_mismatch" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "map_asesor_variantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asesor_raw" text NOT NULL,
	"asesor_norm" text NOT NULL,
	"id_advisor" uuid,
	"confidence" numeric(4, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "map_cuenta_variantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_raw" text NOT NULL,
	"cuenta_norm" text NOT NULL,
	"heuristica" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matching_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"source_table" text NOT NULL,
	"source_record_id" uuid NOT NULL,
	"match_status" text NOT NULL,
	"match_rule" text,
	"target_client_id" uuid,
	"target_advisor_id" uuid,
	"confidence" numeric(4, 3),
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stg_cluster_cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"idcuenta" text,
	"comitente" integer,
	"cuotapartista" integer,
	"cuenta" text,
	"fecha_alta" date,
	"es_juridica" boolean,
	"asesor" text,
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
CREATE TABLE IF NOT EXISTS "stg_comisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"fecha_concertacion" date,
	"comitente" integer,
	"cuotapartista" integer,
	"cuenta" text,
	"tipo" text,
	"descripcion" text,
	"ticker" text,
	"cantidad" numeric(28, 8),
	"precio" numeric(18, 6),
	"precio_ref" numeric(18, 6),
	"iva_comision" numeric(18, 6),
	"comision_pesificada" numeric(18, 6),
	"cotizacion_dolar" numeric(18, 6),
	"comision_dolarizada" numeric(18, 6),
	"asesor" text,
	"cuil_asesor" text,
	"equipo" text,
	"unidad_de_negocio" text,
	"productor" text,
	"id_persona_asesor" integer,
	"referidor" text,
	"arancel" text,
	"esquema_comisiones" text,
	"fecha_alta" date,
	"porcentaje" numeric(7, 4),
	"cuit_facturacion" text,
	"es_juridica" boolean,
	"pais" text,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_aum_snapshot" ADD CONSTRAINT "fact_aum_snapshot_id_client_dim_client_id_fk" FOREIGN KEY ("id_client") REFERENCES "public"."dim_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_aum_snapshot" ADD CONSTRAINT "fact_aum_snapshot_id_advisor_owner_dim_advisor_id_fk" FOREIGN KEY ("id_advisor_owner") REFERENCES "public"."dim_advisor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_commission" ADD CONSTRAINT "fact_commission_id_client_dim_client_id_fk" FOREIGN KEY ("id_client") REFERENCES "public"."dim_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_commission" ADD CONSTRAINT "fact_commission_id_advisor_benef_dim_advisor_id_fk" FOREIGN KEY ("id_advisor_benef") REFERENCES "public"."dim_advisor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "map_asesor_variantes" ADD CONSTRAINT "map_asesor_variantes_id_advisor_dim_advisor_id_fk" FOREIGN KEY ("id_advisor") REFERENCES "public"."dim_advisor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_audit" ADD CONSTRAINT "matching_audit_run_id_integration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."integration_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_audit" ADD CONSTRAINT "matching_audit_target_client_id_dim_client_id_fk" FOREIGN KEY ("target_client_id") REFERENCES "public"."dim_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_audit" ADD CONSTRAINT "matching_audit_target_advisor_id_dim_advisor_id_fk" FOREIGN KEY ("target_advisor_id") REFERENCES "public"."dim_advisor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matching_audit" ADD CONSTRAINT "matching_audit_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stg_cluster_cuentas" ADD CONSTRAINT "stg_cluster_cuentas_run_id_integration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."integration_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stg_comisiones" ADD CONSTRAINT "stg_comisiones_run_id_integration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."integration_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_advisor_norm" ON "dim_advisor" USING btree ("asesor_norm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_advisor_equipo" ON "dim_advisor" USING btree ("equipo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dim_client_comit_cuota_unique" ON "dim_client" USING btree ("comitente","cuotapartista");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_client_cuenta_norm" ON "dim_client" USING btree ("cuenta_norm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_client_equipo" ON "dim_client" USING btree ("equipo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fact_aum_snapshot_unique" ON "fact_aum_snapshot" USING btree ("snapshot_date","id_client");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_aum_snapshot_date" ON "fact_aum_snapshot" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_aum_snapshot_advisor" ON "fact_aum_snapshot" USING btree ("id_advisor_owner");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fact_commission_op_id_unique" ON "fact_commission" USING btree ("op_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_commission_fecha" ON "fact_commission" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_commission_client" ON "fact_commission" USING btree ("id_client");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_commission_advisor" ON "fact_commission" USING btree ("id_advisor_benef");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_commission_tipo" ON "fact_commission" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "map_asesor_raw_unique" ON "map_asesor_variantes" USING btree ("asesor_raw");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_map_asesor_norm" ON "map_asesor_variantes" USING btree ("asesor_norm");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "map_cuenta_raw_unique" ON "map_cuenta_variantes" USING btree ("cuenta_raw");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matching_audit_source" ON "matching_audit" USING btree ("source_table","source_record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matching_audit_status" ON "matching_audit" USING btree ("match_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stg_comisiones_fecha" ON "stg_comisiones" USING btree ("fecha_concertacion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stg_comisiones_comit" ON "stg_comisiones" USING btree ("comitente");