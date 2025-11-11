CREATE TABLE IF NOT EXISTS "aum_monthly_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_number" text,
	"id_cuenta" text,
	"report_month" integer NOT NULL,
	"report_year" integer NOT NULL,
	"file_id" uuid NOT NULL,
	"aum_dollars" numeric(18, 6),
	"bolsa_arg" numeric(18, 6),
	"fondos_arg" numeric(18, 6),
	"bolsa_bci" numeric(18, 6),
	"pesos" numeric(18, 6),
	"mep" numeric(18, 6),
	"cable" numeric(18, 6),
	"cv7000" numeric(18, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aum_import_files" ADD COLUMN "file_type" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "aum_import_files" ADD COLUMN "report_month" integer;--> statement-breakpoint
ALTER TABLE "aum_import_files" ADD COLUMN "report_year" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aum_monthly_snapshots" ADD CONSTRAINT "aum_monthly_snapshots_file_id_aum_import_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."aum_import_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aum_monthly_snapshots_unique" ON "aum_monthly_snapshots" USING btree ("account_number","id_cuenta","report_month","report_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_monthly_snapshots_account" ON "aum_monthly_snapshots" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_monthly_snapshots_id_cuenta" ON "aum_monthly_snapshots" USING btree ("id_cuenta");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_monthly_snapshots_month_year" ON "aum_monthly_snapshots" USING btree ("report_month","report_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_monthly_snapshots_file" ON "aum_monthly_snapshots" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_monthly_snapshots_account_month_year" ON "aum_monthly_snapshots" USING btree ("account_number","id_cuenta","report_year","report_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_files_month_year" ON "aum_import_files" USING btree ("file_type","report_month","report_year");