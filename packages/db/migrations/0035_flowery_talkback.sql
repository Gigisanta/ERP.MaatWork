CREATE TABLE "contact_stage_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"pipeline_stage_id" uuid NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_stage_interactions" ADD CONSTRAINT "contact_stage_interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_stage_interactions" ADD CONSTRAINT "contact_stage_interactions_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_stage_interactions_unique" ON "contact_stage_interactions" USING btree ("contact_id","pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "idx_contact_stage_interactions_contact" ON "contact_stage_interactions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contact_stage_interactions_stage" ON "contact_stage_interactions" USING btree ("pipeline_stage_id");