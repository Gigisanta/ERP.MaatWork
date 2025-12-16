CREATE TABLE "team_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"type" text NOT NULL,
	"target_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"current_value" numeric(18, 2) DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_goals" ADD CONSTRAINT "team_goals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_goals_unique" ON "team_goals" USING btree ("team_id","month","year","type");--> statement-breakpoint
CREATE INDEX "idx_team_goals_team" ON "team_goals" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_team_goals_date" ON "team_goals" USING btree ("year","month");