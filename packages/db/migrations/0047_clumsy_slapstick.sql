-- Rename tables
ALTER TABLE "portfolio_templates" RENAME TO "portfolios";
ALTER TABLE "portfolio_template_lines" RENAME TO "portfolio_lines";

-- Rename columns
ALTER TABLE "client_portfolio_assignments" RENAME COLUMN "template_id" TO "portfolio_id";
ALTER TABLE "portfolio_lines" RENAME COLUMN "template_id" TO "portfolio_id";

-- Add columns to portfolios
ALTER TABLE "portfolios" ADD COLUMN "code" text;
ALTER TABLE "portfolios" ADD COLUMN "type" text DEFAULT 'template' NOT NULL;
ALTER TABLE "portfolios" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;

-- Remove old constraints (using old names or auto-generated names, Drizzle generated drop statements are useful)
ALTER TABLE "portfolio_lines" DROP CONSTRAINT "chk_ptl_weight";
ALTER TABLE "client_portfolio_assignments" DROP CONSTRAINT "client_portfolio_assignments_template_id_portfolio_templates_id_fk";
ALTER TABLE "portfolio_lines" DROP CONSTRAINT "portfolio_template_lines_template_id_portfolio_templates_id_fk";
ALTER TABLE "portfolio_lines" DROP CONSTRAINT "portfolio_template_lines_asset_class_lookup_asset_class_id_fk";
ALTER TABLE "portfolio_lines" DROP CONSTRAINT "portfolio_template_lines_instrument_id_instruments_id_fk";
DROP INDEX "idx_ptl_template_weight";
DROP INDEX "client_portfolio_assignments_unique";

-- Migrate Data from Benchmarks
-- Insert benchmarks (as type 'benchmark')
INSERT INTO "portfolios" ("id", "code", "name", "description", "type", "is_system", "created_by_user_id", "created_at")
SELECT "id", "code", "name", "description", 'benchmark', "is_system", "created_by_user_id", "created_at"
FROM "benchmark_definitions";

-- Insert benchmark components (as portfolio lines)
INSERT INTO "portfolio_lines" ("id", "portfolio_id", "target_type", "instrument_id", "target_weight")
SELECT "id", "benchmark_id", 'instrument', "instrument_id", "weight"
FROM "benchmark_components";

-- Drop old tables
DROP TABLE "benchmark_components" CASCADE;
DROP TABLE "benchmark_definitions" CASCADE;

-- Add new constraints and indexes
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_code_unique" UNIQUE("code");
ALTER TABLE "client_portfolio_assignments" ADD CONSTRAINT "client_portfolio_assignments_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "portfolio_lines" ADD CONSTRAINT "portfolio_lines_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "portfolio_lines" ADD CONSTRAINT "portfolio_lines_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "portfolio_lines" ADD CONSTRAINT "portfolio_lines_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "portfolio_lines" ADD CONSTRAINT "chk_ptl_weight" CHECK ("portfolio_lines"."target_weight" >= 0 and "portfolio_lines"."target_weight" <= 1);

CREATE INDEX "idx_portfolio_code" ON "portfolios" USING btree ("code");
CREATE INDEX "idx_portfolio_type" ON "portfolios" USING btree ("type");
CREATE INDEX "idx_portfolio_is_system" ON "portfolios" USING btree ("is_system");
CREATE INDEX "idx_portfolio_lines_portfolio_weight" ON "portfolio_lines" USING btree ("portfolio_id","target_weight");
CREATE UNIQUE INDEX "client_portfolio_assignments_unique" ON "client_portfolio_assignments" USING btree ("contact_id","portfolio_id","start_date");