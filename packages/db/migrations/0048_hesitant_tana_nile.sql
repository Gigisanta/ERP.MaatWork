ALTER TABLE "portfolios" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_portfolio_deleted_at" ON "portfolios" USING btree ("deleted_at");