CREATE INDEX "idx_attachments_deleted_at" ON "attachments" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_audio_files_deleted_at" ON "audio_files" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_broker_accounts_deleted_at" ON "broker_accounts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_notes_deleted_at" ON "notes" USING btree ("deleted_at");