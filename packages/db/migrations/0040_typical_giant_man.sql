CREATE TABLE "contact_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_normalized" text NOT NULL,
	"source" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "meeting_room_calendar_id" text;--> statement-breakpoint
ALTER TABLE "contact_aliases" ADD CONSTRAINT "contact_aliases_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_aliases_normalized" ON "contact_aliases" USING btree ("alias_normalized");--> statement-breakpoint
CREATE INDEX "idx_contact_aliases_contact" ON "contact_aliases" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_aliases_unique" ON "contact_aliases" USING btree ("contact_id","alias_normalized");