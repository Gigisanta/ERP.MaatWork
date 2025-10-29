DROP TABLE "lookup_meeting_source";--> statement-breakpoint
DROP TABLE "meeting_ai";--> statement-breakpoint
DROP TABLE "meeting_participants";--> statement-breakpoint
DROP TABLE "meeting_tags";--> statement-breakpoint
DROP TABLE "meetings";--> statement-breakpoint
DROP TABLE "transcription_segments";--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_meeting_id_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_meeting_id_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_audio_file_id_audio_files_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_meeting_id_meetings_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_attachments_meeting";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contacts_stage";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contacts_sla_status";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_notes_transcription_status";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_notes_keywords_dummy";--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "meeting_id";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "lifecycle_stage";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "sla_status";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "sla_due_at";--> statement-breakpoint
ALTER TABLE "daily_metrics_user" DROP COLUMN IF EXISTS "num_meetings";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "meeting_id";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "audio_file_id";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "transcription_status";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "keywords";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "sentiment";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "language";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "meeting_id";