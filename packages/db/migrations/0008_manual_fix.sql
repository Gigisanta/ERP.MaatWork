-- Create team_membership_requests table
CREATE TABLE IF NOT EXISTS "team_membership_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" uuid
);

-- Add foreign key constraints
ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "team_membership_requests_unique" ON "team_membership_requests" USING btree ("user_id","manager_id");

-- Add password_hash column to users if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" timestamp;
