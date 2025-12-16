CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"summary" text,
	"description" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"status" text,
	"html_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "normalized_full_name" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_calendar_events_google_id" ON "calendar_events" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_events_user" ON "calendar_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_events_start" ON "calendar_events" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "idx_calendar_events_user_start" ON "calendar_events" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_contacts_normalized_full_name" ON "contacts" USING btree ("normalized_full_name");