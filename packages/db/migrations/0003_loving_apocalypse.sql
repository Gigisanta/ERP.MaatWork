CREATE TABLE IF NOT EXISTS "monthly_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"new_prospects_goal" integer DEFAULT 0 NOT NULL,
	"first_meetings_goal" integer DEFAULT 0 NOT NULL,
	"second_meetings_goal" integer DEFAULT 0 NOT NULL,
	"new_clients_goal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "business_line" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "monthly_goals_unique" ON "monthly_goals" USING btree ("month","year");