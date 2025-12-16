CREATE TABLE "google_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text NOT NULL,
	"calendar_id" text,
	"calendar_sync_enabled" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_oauth_tokens" ADD CONSTRAINT "google_oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_google_oauth_tokens_user_id" ON "google_oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_google_oauth_tokens_google_id" ON "google_oauth_tokens" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "idx_google_oauth_tokens_email" ON "google_oauth_tokens" USING btree ("email");--> statement-breakpoint
ALTER TABLE "benchmark_components" ADD CONSTRAINT "chk_benchmark_weight" CHECK ("benchmark_components"."weight" >= 0 and "benchmark_components"."weight" <= 1);--> statement-breakpoint
ALTER TABLE "portfolio_template_lines" ADD CONSTRAINT "chk_ptl_weight" CHECK ("portfolio_template_lines"."target_weight" >= 0 and "portfolio_template_lines"."target_weight" <= 1);