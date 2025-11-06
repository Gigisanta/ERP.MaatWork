ALTER TABLE "contacts" ADD COLUMN "prioridades" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preocupaciones" jsonb DEFAULT '[]'::jsonb NOT NULL;