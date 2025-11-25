ALTER TABLE "contact_tags" ADD COLUMN IF NOT EXISTS "monthly_premium" integer;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD COLUMN IF NOT EXISTS "policy_number" text;