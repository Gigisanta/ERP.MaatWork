CREATE INDEX IF NOT EXISTS "idx_benchmark_components_weight" ON "benchmark_components" USING btree ("benchmark_id","weight");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_advisor_stage_deleted" ON "contacts" USING btree ("assigned_advisor_id","pipeline_stage_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ptl_template_weight" ON "portfolio_template_lines" USING btree ("template_id","target_weight");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_contact_status_due" ON "tasks" USING btree ("contact_id","status","due_date");