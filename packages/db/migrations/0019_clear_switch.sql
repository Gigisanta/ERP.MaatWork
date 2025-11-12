CREATE TABLE IF NOT EXISTS "career_plan_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"level_number" integer NOT NULL,
	"index" numeric NOT NULL,
	"percentage" numeric NOT NULL,
	"annual_goal_usd" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "career_plan_levels_level_number_unique" ON "career_plan_levels" USING btree ("level_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_career_plan_levels_level_number" ON "career_plan_levels" USING btree ("level_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_career_plan_levels_is_active" ON "career_plan_levels" USING btree ("is_active");--> statement-breakpoint
-- Seed inicial desde indice_honorarios_abax.csv
INSERT INTO "career_plan_levels" ("category", "level", "level_number", "index", "percentage", "annual_goal_usd", "is_active") VALUES
('AGENTE F. JUNIOR', 'Nivel 1 Junior', 1, '1.5', '37.5', 30000, true),
('AGENTE F. JUNIOR', 'Nivel 2 Junior', 2, '1.7', '42.5', 37000, true),
('AGENTE F. JUNIOR', 'Nivel 3 Junior', 3, '1.85', '46.25', 50000, true),
('AGENTE F. JUNIOR', 'Nivel 4 Junior', 4, '1.95', '48.75', 70000, true),
('AGENTE F. JUNIOR', 'Nivel 5 Junior', 5, '2.0', '50', 84000, true),
('AGENTE F. SEMI-SENIOR', 'Nivel 6 Semi-Senior', 6, '2.05', '51.25', 95000, true),
('AGENTE F. SEMI-SENIOR', 'Nivel 7 Semi-Senior', 7, '2.09', '52.25', 105000, true),
('AGENTE F. SEMI-SENIOR', 'Nivel 8 Semi-Senior', 8, '2.2', '55', 115000, true),
('AGENTE F. SENIOR', 'Nivel 9 Senior', 9, '2.3', '57.5', 125000, true),
('AGENTE F. SENIOR', 'Nivel 10 Senior', 10, '2.4', '60', 140000, true);