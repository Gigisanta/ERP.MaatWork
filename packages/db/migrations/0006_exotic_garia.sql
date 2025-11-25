CREATE TABLE IF NOT EXISTS "advisor_account_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_number" text NOT NULL,
	"advisor_name" text,
	"advisor_raw" text,
	"matched_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "aum_dollars" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "bolsa_arg" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "fondos_arg" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "bolsa_bci" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "pesos" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "mep" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "cable" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "aum_import_rows" ADD COLUMN "cv7000" numeric(18, 6);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advisor_account_mapping" ADD CONSTRAINT "advisor_account_mapping_matched_user_id_users_id_fk" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "advisor_account_mapping_account_unique" ON "advisor_account_mapping" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_advisor_account_mapping_account" ON "advisor_account_mapping" USING btree ("account_number");