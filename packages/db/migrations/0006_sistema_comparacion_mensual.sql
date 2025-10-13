-- Sistema de Comparación Mensual de Cuentas
-- Migración para tablas del sistema de comparación mensual entre reportes

-- Tabla maestro_cuentas: estado vigente de todas las cuentas
CREATE TABLE IF NOT EXISTS "maestro_cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idcuenta" text NOT NULL,
	"comitente" integer NOT NULL,
	"cuotapartista" integer NOT NULL,
	"descripcion" text NOT NULL,
	"asesor" text,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_alta" date,
	"fecha_ultima_actualizacion" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla staging_mensual: datos temporales del Excel mensual
CREATE TABLE IF NOT EXISTS "staging_mensual" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carga_id" uuid NOT NULL,
	"idcuenta" text NOT NULL,
	"comitente" integer NOT NULL,
	"cuotapartista" integer NOT NULL,
	"descripcion" text NOT NULL,
	"asesor" text,
	"hash_archivo" text NOT NULL,
	"fecha_carga" timestamp with time zone DEFAULT now() NOT NULL,
	"procesado" boolean DEFAULT false NOT NULL
);

-- Tabla asignaciones_asesor: asignaciones manuales de asesores
CREATE TABLE IF NOT EXISTS "asignaciones_asesor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idcuenta" text NOT NULL,
	"asesor_anterior" text,
	"asesor_nuevo" text NOT NULL,
	"motivo" text,
	"aplicado" boolean DEFAULT false NOT NULL,
	"aplicado_en" timestamp with time zone,
	"carga_id" uuid NOT NULL,
	"asignado_por_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla auditoria_cargas: registro de cada carga mensual
CREATE TABLE IF NOT EXISTS "auditoria_cargas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mes" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"hash_archivo" text NOT NULL,
	"tamano_archivo" integer NOT NULL,
	"total_registros" integer NOT NULL,
	"nuevos_detectados" integer DEFAULT 0 NOT NULL,
	"modificados_detectados" integer DEFAULT 0 NOT NULL,
	"sin_asesor" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'cargado' NOT NULL,
	"aplicado_en" timestamp with time zone,
	"aplicado_por_user_id" uuid,
	"cargado_por_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla snapshots_maestro: snapshots históricos del maestro
CREATE TABLE IF NOT EXISTS "snapshots_maestro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carga_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"datos" jsonb NOT NULL,
	"total_registros" integer NOT NULL,
	"hash_datos" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla diff_detalle: detalle de cambios detectados
CREATE TABLE IF NOT EXISTS "diff_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carga_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"idcuenta" text NOT NULL,
	"comitente_anterior" integer,
	"cuotapartista_anterior" integer,
	"descripcion_anterior" text,
	"asesor_anterior" text,
	"comitente_nuevo" integer NOT NULL,
	"cuotapartista_nuevo" integer NOT NULL,
	"descripcion_nueva" text NOT NULL,
	"asesor_nuevo" text,
	"campos_cambiados" text[] DEFAULT '{}' NOT NULL,
	"aplicado" boolean DEFAULT false NOT NULL,
	"aplicado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para maestro_cuentas
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_cuentas_idcuenta_unique" ON "maestro_cuentas" USING btree ("idcuenta");
CREATE INDEX IF NOT EXISTS "idx_maestro_cuentas_comitente_cuota" ON "maestro_cuentas" USING btree ("comitente", "cuotapartista");
CREATE INDEX IF NOT EXISTS "idx_maestro_cuentas_asesor" ON "maestro_cuentas" USING btree ("asesor");
CREATE INDEX IF NOT EXISTS "idx_maestro_cuentas_activo" ON "maestro_cuentas" USING btree ("activo");

-- Índices para staging_mensual
CREATE INDEX IF NOT EXISTS "idx_staging_mensual_carga" ON "staging_mensual" USING btree ("carga_id");
CREATE INDEX IF NOT EXISTS "idx_staging_mensual_idcuenta" ON "staging_mensual" USING btree ("idcuenta");
CREATE INDEX IF NOT EXISTS "idx_staging_mensual_hash" ON "staging_mensual" USING btree ("hash_archivo");

-- Índices para asignaciones_asesor
CREATE INDEX IF NOT EXISTS "idx_asignaciones_asesor_idcuenta" ON "asignaciones_asesor" USING btree ("idcuenta");
CREATE INDEX IF NOT EXISTS "idx_asignaciones_asesor_carga" ON "asignaciones_asesor" USING btree ("carga_id");
CREATE INDEX IF NOT EXISTS "idx_asignaciones_asesor_aplicado" ON "asignaciones_asesor" USING btree ("aplicado");

-- Índices para auditoria_cargas
CREATE INDEX IF NOT EXISTS "idx_auditoria_cargas_mes" ON "auditoria_cargas" USING btree ("mes");
CREATE INDEX IF NOT EXISTS "idx_auditoria_cargas_hash" ON "auditoria_cargas" USING btree ("hash_archivo");
CREATE INDEX IF NOT EXISTS "idx_auditoria_cargas_estado" ON "auditoria_cargas" USING btree ("estado");
CREATE UNIQUE INDEX IF NOT EXISTS "auditoria_cargas_mes_hash_unique" ON "auditoria_cargas" USING btree ("mes", "hash_archivo");

-- Índices para snapshots_maestro
CREATE INDEX IF NOT EXISTS "idx_snapshots_maestro_carga" ON "snapshots_maestro" USING btree ("carga_id");
CREATE INDEX IF NOT EXISTS "idx_snapshots_maestro_tipo" ON "snapshots_maestro" USING btree ("tipo");
CREATE INDEX IF NOT EXISTS "idx_snapshots_maestro_hash" ON "snapshots_maestro" USING btree ("hash_datos");

-- Índices para diff_detalle
CREATE INDEX IF NOT EXISTS "idx_diff_detalle_carga" ON "diff_detalle" USING btree ("carga_id");
CREATE INDEX IF NOT EXISTS "idx_diff_detalle_tipo" ON "diff_detalle" USING btree ("tipo");
CREATE INDEX IF NOT EXISTS "idx_diff_detalle_idcuenta" ON "diff_detalle" USING btree ("idcuenta");
CREATE INDEX IF NOT EXISTS "idx_diff_detalle_aplicado" ON "diff_detalle" USING btree ("aplicado");

-- Foreign Keys
ALTER TABLE "asignaciones_asesor" ADD CONSTRAINT "asignaciones_asesor_asignado_por_user_id_users_id_fk" FOREIGN KEY ("asignado_por_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "auditoria_cargas" ADD CONSTRAINT "auditoria_cargas_aplicado_por_user_id_users_id_fk" FOREIGN KEY ("aplicado_por_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "auditoria_cargas" ADD CONSTRAINT "auditoria_cargas_cargado_por_user_id_users_id_fk" FOREIGN KEY ("cargado_por_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "snapshots_maestro" ADD CONSTRAINT "snapshots_maestro_carga_id_auditoria_cargas_id_fk" FOREIGN KEY ("carga_id") REFERENCES "auditoria_cargas"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "diff_detalle" ADD CONSTRAINT "diff_detalle_carga_id_auditoria_cargas_id_fk" FOREIGN KEY ("carga_id") REFERENCES "auditoria_cargas"("id") ON DELETE no action ON UPDATE no action;



