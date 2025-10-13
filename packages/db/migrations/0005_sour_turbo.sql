DROP TABLE "transcription_segments";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_audio_files_transcribed";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_notes_transcription_status";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audio_files_created" ON "audio_files" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "audio_files" DROP COLUMN IF EXISTS "transcription_text";--> statement-breakpoint
ALTER TABLE "audio_files" DROP COLUMN IF EXISTS "transcription_model";--> statement-breakpoint
ALTER TABLE "audio_files" DROP COLUMN IF EXISTS "transcription_error";--> statement-breakpoint
ALTER TABLE "audio_files" DROP COLUMN IF EXISTS "transcribed_at";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "transcription_status";