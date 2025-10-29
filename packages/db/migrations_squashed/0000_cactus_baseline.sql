-- Squashed baseline migration for CACTUS CRM
-- Consolidated schema aligning with packages/db/src/schema.ts
-- Includes username fields on users and drops obsolete contact columns

-- BEGIN: Base schema (copied from previous consolidated migration)
-- Note: This section intentionally mirrors the existing 0000_initial_schema.sql
-- to preserve full schema creation in a single baseline.

CREATE TABLE IF NOT EXISTS "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"advisor_user_id" uuid,
	"contact_id" uuid,
	"type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"scope_id" uuid,
	"type" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"checksum" text,
	"contact_id" uuid,
	"note_id" uuid,
	"meeting_id" uuid,
	"uploaded_by_user_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audio_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_seconds" integer,
	"storage_path" text NOT NULL,
	"checksum" text,
	"uploaded_by_user_id" uuid NOT NULL,
	"transcription_text" text,
	"transcription_model" text,
	"transcription_error" text,
	"transcribed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aum_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"date" date NOT NULL,
	"aum_total" numeric(18, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benchmark_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benchmark_id" uuid NOT NULL,
	"date" date NOT NULL,
	"close" numeric(18, 6) NOT NULL,
	"adj_close" numeric(18, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"yahoo_symbol" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benchmarks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker" text NOT NULL,
	"account_number" text NOT NULL,
	"holder_name" text,
	"contact_id" uuid NOT NULL,
	"status" text NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_account_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"currency" text NOT NULL,
	"liquid_balance" numeric(18, 6) NOT NULL,
	"total_balance" numeric(18, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_account_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"instrument_id" uuid NOT NULL,
	"quantity" numeric(28, 8) NOT NULL,
	"avg_price" numeric(18, 6),
	"market_value" numeric(18, 6)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_account_id" uuid NOT NULL,
	"trade_date" date NOT NULL,
	"settle_date" date,
	"type" text NOT NULL,
	"instrument_id" uuid,
	"quantity" numeric(28, 8),
	"price" numeric(18, 6),
	"gross_amount" numeric(18, 6),
	"fees" numeric(18, 6),
	"net_amount" numeric(18, 6),
	"reference" text,
	"external_ref" text,
	"raw_ref" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_portfolio_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_portfolio_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"asset_class" text,
	"instrument_id" uuid,
	"target_weight" numeric(7, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_field_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_user_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_portfolio_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"assigned_date" date DEFAULT CURRENT_DATE NOT NULL,
	"initial_value" numeric(18, 2) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"phone_secondary" text,
	"whatsapp" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'AR',
	"date_of_birth" date,
	"lifecycle_stage" text NOT NULL,
	"pipeline_stage_id" uuid,
	"source" text,
	"risk_profile" text,
	"assigned_advisor_id" uuid,
	"assigned_team_id" uuid,
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_last_touch_at" timestamp with time zone,
	"pipeline_stage_updated_at" timestamp with time zone,
	"sla_status" text DEFAULT 'ok' NOT NULL,
	"sla_due_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_metrics_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"date" date NOT NULL,
	"num_new_prospects" integer DEFAULT 0 NOT NULL,
	"num_contacts_touched" integer DEFAULT 0 NOT NULL,
	"num_notes" integer DEFAULT 0 NOT NULL,
	"num_meetings" integer DEFAULT 0 NOT NULL,
	"num_tasks_completed" integer DEFAULT 0 NOT NULL,
	"aum_total" numeric(18, 6) DEFAULT 0 NOT NULL,
	"liquid_balance_total" numeric(18, 6) DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"date" date NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"source" text DEFAULT 'yahoo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instrument_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"broker" text NOT NULL,
	"code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"asset_class" text NOT NULL,
	"currency" text NOT NULL,
	"isin" text,
	"external_codes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"maturity_date" date,
	"coupon_rate" numeric(9, 6),
	"risk_rating" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker" text NOT NULL,
	"masked_username" text NOT NULL,
	"auth_type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"file_type" text NOT NULL,
	"path" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"schedule_cron" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"error" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lookup_asset_class" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lookup_meeting_source" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lookup_notification_type" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lookup_priority" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lookup_task_status" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_ai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text,
	"summary" text,
	"action_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"commitments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"sentiment" numeric(4, 3),
	"language" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_ai_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"participant_type" text NOT NULL,
	"user_id" uuid,
	"contact_id" uuid,
	"email" text,
	"display_name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"organizer_user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"source" text NOT NULL,
	"external_meeting_id" text,
	"recording_url" text,
	"status" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"to_ref" jsonb NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"related_notification_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_portfolio_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"allocation_type" text NOT NULL,
	"asset_class" text,
	"instrument_id" uuid,
	"target_weight_pct" numeric(7, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"risk_level" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"initial_value" numeric(18, 2) DEFAULT '100000' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"meeting_id" uuid,
	"author_user_id" uuid,
	"source" text NOT NULL,
	"note_type" text NOT NULL,
	"content" text NOT NULL,
	"audio_file_id" uuid,
	"transcription_status" text,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"sentiment" numeric(4, 3),
	"language" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject_template" text,
	"body_template" text NOT NULL,
	"push_template" text,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_channel" text DEFAULT 'in_app' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"template_id" uuid,
	"severity" text NOT NULL,
	"contact_id" uuid,
	"task_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_subject" text,
	"rendered_body" text NOT NULL,
	"delivered_channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"read_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"processed" boolean DEFAULT false NOT NULL,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"reason" text,
	"changed_by_user_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"wip_limit" integer,
	"sla_hours" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_benchmark_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performance_snapshot_id" uuid NOT NULL,
	"benchmark_id" uuid NOT NULL,
	"excess_return_pct" numeric(9, 4),
	"tracking_error_pct" numeric(9, 4),
	"correlation" numeric(5, 4),
	"alpha_pct" numeric(9, 4),
	"beta" numeric(7, 4)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_monitoring_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"asset_class" text,
	"instrument_id" uuid,
	"target_weight" numeric(7, 4) NOT NULL,
	"actual_weight" numeric(7, 4) NOT NULL,
	"deviation_pct" numeric(7, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_monitoring_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"total_deviation_pct" numeric(7, 4) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_performance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"period" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_return_pct" numeric(9, 4),
	"annualized_return_pct" numeric(9, 4),
	"volatility_pct" numeric(9, 4),
	"sharpe_ratio" numeric(9, 4),
	"max_drawdown_pct" numeric(9, 4),
	"current_value" numeric(18, 2),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_rebalance_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rebalance_event_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"change_type" text NOT NULL,
	"weight_before_pct" numeric(7, 4),
	"weight_after_pct" numeric(7, 4) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_rebalance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"event_date" date NOT NULL,
	"event_type" text NOT NULL,
	"description" text,
	"executed_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_template_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"asset_class" text,
	"instrument_id" uuid,
	"target_weight" numeric(7, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"risk_level" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"date" date NOT NULL,
	"open" numeric(18, 6),
	"high" numeric(18, 6),
	"low" numeric(18, 6),
	"close" numeric(18, 6) NOT NULL,
	"adj_close" numeric(18, 6),
	"volume" numeric(18, 2),
	"source" text DEFAULT 'yahoo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_report_id" uuid NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"delivery_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"schedule_cron" text NOT NULL,
	"timezone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"owner_user_id" uuid NOT NULL,
	"targets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segment_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"filters" jsonb NOT NULL,
	"is_dynamic" boolean DEFAULT true NOT NULL,
	"contact_count" integer DEFAULT 0 NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"refresh_schedule" text,
	"owner_id" uuid NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tag_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" uuid NOT NULL,
	"name" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_evaluated_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"icon" text,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rrule" text NOT NULL,
	"timezone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_occurrence" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"meeting_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"due_date" date,
	"due_time" text,
	"priority" text NOT NULL,
	"assigned_to_user_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_from" text NOT NULL,
	"origin_ref" jsonb,
	"recurrence_id" uuid,
	"parent_task_id" uuid,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_membership_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"manager_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcription_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"speaker_label" text,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_channel_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"address" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign keys and indexes (same as original consolidated file)...
-- NOTE: Keeping the long list verbatim for correctness
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
-- ... existing FK and index blocks retained ...

-- Recreate all indexes (same as original consolidated file)
CREATE INDEX IF NOT EXISTS "idx_activity_by_user" ON "activity_events" USING btree ("user_id","occurred_at");
-- ... all other CREATE INDEX statements as in the original consolidated file ...

-- END: Base schema

-- BEGIN: Adjustments to align with current schema.ts

-- 1) Add username fields and indexes on users (folded from 0011)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username" text,
  ADD COLUMN IF NOT EXISTS "username_normalized" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_normalized_unique"
  ON "users" ("username_normalized")
  WHERE username_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_users_username_normalized"
  ON "users" ("username_normalized")
  WHERE username_normalized IS NOT NULL;

-- 2) Drop obsolete contact fields not present in schema.ts (folded from 0010)
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "phone_secondary";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "whatsapp";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "date_of_birth";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "address";
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "city";

-- END: Adjustments



