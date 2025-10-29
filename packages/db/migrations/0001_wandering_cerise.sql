CREATE TABLE IF NOT EXISTS "benchmark_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benchmark_id" uuid NOT NULL,
	"instrument_id" uuid,
	"weight" numeric(7, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benchmark_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benchmark_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"calculation_formula" text,
	"unit" text NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "metric_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"close_price" numeric(18, 6) NOT NULL,
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "benchmark_prices";--> statement-breakpoint
DROP TABLE "benchmarks";--> statement-breakpoint
DROP TABLE "contact_portfolio_assignments";--> statement-breakpoint
DROP TABLE "fx_rates";--> statement-breakpoint
DROP TABLE "model_portfolio_allocations";--> statement-breakpoint
DROP TABLE "model_portfolios";--> statement-breakpoint
DROP TABLE "portfolio_benchmark_comparisons";--> statement-breakpoint
DROP TABLE "portfolio_performance_snapshots";--> statement-breakpoint
DROP TABLE "portfolio_rebalance_changes";--> statement-breakpoint
DROP TABLE "portfolio_rebalance_events";--> statement-breakpoint
DROP TABLE "prices";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benchmark_components" ADD CONSTRAINT "benchmark_components_benchmark_id_benchmark_definitions_id_fk" FOREIGN KEY ("benchmark_id") REFERENCES "public"."benchmark_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benchmark_components" ADD CONSTRAINT "benchmark_components_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benchmark_definitions" ADD CONSTRAINT "benchmark_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benchmark_components_benchmark" ON "benchmark_components" USING btree ("benchmark_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benchmark_components_instrument" ON "benchmark_components" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benchmark_code" ON "benchmark_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metric_code" ON "metric_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metric_category" ON "metric_definitions" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "price_snapshots_unique" ON "price_snapshots" USING btree ("instrument_id","as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_snapshots_date" ON "price_snapshots" USING btree ("as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_snapshots_instrument" ON "price_snapshots" USING btree ("instrument_id");