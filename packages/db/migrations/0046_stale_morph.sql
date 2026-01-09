DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_status') THEN
        CREATE TYPE "public"."feedback_status" AS ENUM('new', 'in_progress', 'completed', 'closed');
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE "public"."feedback_type" AS ENUM('feedback', 'feature_request', 'bug');
    END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "feedback_type" DEFAULT 'feedback' NOT NULL,
	"content" text NOT NULL,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_user_id_users_id_fk') THEN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_user_id" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_status" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_created_at" ON "feedback" USING btree ("created_at");