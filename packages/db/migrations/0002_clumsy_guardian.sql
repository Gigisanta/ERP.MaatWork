CREATE TABLE IF NOT EXISTS "advisor_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias_raw" text NOT NULL,
	"alias_normalized" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advisor_aliases" ADD CONSTRAINT "advisor_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "advisor_aliases_normalized_unique" ON "advisor_aliases" USING btree ("alias_normalized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_advisor_aliases_user" ON "advisor_aliases" USING btree ("user_id");