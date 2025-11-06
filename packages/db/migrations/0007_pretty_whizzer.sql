CREATE TABLE IF NOT EXISTS "capacitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"tema" text NOT NULL,
	"link" text NOT NULL,
	"fecha" date,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "capacitaciones" ADD CONSTRAINT "capacitaciones_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_tema" ON "capacitaciones" USING btree ("tema");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_fecha" ON "capacitaciones" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_capacitaciones_created_by" ON "capacitaciones" USING btree ("created_by_user_id");