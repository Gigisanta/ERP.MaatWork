CREATE TABLE IF NOT EXISTS "automation_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"webhook_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "automation_configs_name_unique" ON "automation_configs" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_configs_trigger" ON "automation_configs" USING btree ("trigger_type","enabled");