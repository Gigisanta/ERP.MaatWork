ALTER TABLE "note_tags" DROP CONSTRAINT "note_tags_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "calendar_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "calendar_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "calendar_connected_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_calendar_connected_by_user_id_users_id_fk" FOREIGN KEY ("calendar_connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_client_portfolio_assignments_contact_status" ON "client_portfolio_assignments" USING btree ("contact_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipeline_stage_history_from_stage_changed" ON "pipeline_stage_history" USING btree ("from_stage","changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_status_created" ON "tasks" USING btree ("assigned_to_user_id","status","created_at") WHERE "tasks"."deleted_at" IS NULL;