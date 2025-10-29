ALTER TABLE "broker_accounts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "broker_accounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_tags_contact" ON "contact_tags" USING btree ("contact_id");--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "phone_secondary";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "whatsapp";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "address";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "city";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "date_of_birth";