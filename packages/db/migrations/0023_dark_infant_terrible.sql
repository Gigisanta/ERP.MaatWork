CREATE TABLE IF NOT EXISTS "prices_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"date" date NOT NULL,
	"open" numeric(18, 6) NOT NULL,
	"high" numeric(18, 6) NOT NULL,
	"low" numeric(18, 6) NOT NULL,
	"close" numeric(18, 6) NOT NULL,
	"adj_close" numeric(18, 6),
	"volume" numeric(28, 8),
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"asof" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prices_intraday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(18, 6) NOT NULL,
	"high" numeric(18, 6) NOT NULL,
	"low" numeric(18, 6) NOT NULL,
	"close" numeric(18, 6) NOT NULL,
	"adj_close" numeric(18, 6),
	"volume" numeric(28, 8),
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_asset_id_instruments_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices_intraday" ADD CONSTRAINT "prices_intraday_asset_id_instruments_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prices_daily_unique" ON "prices_daily" USING btree ("asset_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_daily_date" ON "prices_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_daily_asset" ON "prices_daily" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_daily_asset_date" ON "prices_daily" USING btree ("asset_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prices_intraday_unique" ON "prices_intraday" USING btree ("asset_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_intraday_timestamp" ON "prices_intraday" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_intraday_asset" ON "prices_intraday" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_intraday_asset_timestamp" ON "prices_intraday" USING btree ("asset_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_rows_match_status_account" ON "aum_import_rows" USING btree ("match_status","account_number","is_preferred");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aum_snapshots_contact_date" ON "aum_snapshots" USING btree ("contact_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_broker_accounts_contact_status" ON "broker_accounts" USING btree ("contact_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_advisor_deleted_updated" ON "contacts" USING btree ("assigned_advisor_id","deleted_at","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_metrics_user_date" ON "daily_metrics_user" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notes_contact_created_desc" ON "notes" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_open_by_user" ON "tasks" USING btree ("assigned_to_user_id","due_date") WHERE "tasks"."status" IN ('open', 'in_progress') AND "tasks"."deleted_at" IS NULL;