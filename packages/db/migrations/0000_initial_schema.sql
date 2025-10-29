-- Migration: Initial Schema Consolidation
-- Description: Consolidated migration containing the complete database schema
-- This replaces all previous migrations (0000-0008) which had conflicts and duplications
-- Generated from packages/db/src/schema.ts - includes portfolio management, excludes ETL system
-- Date: 2025-01-14

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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aum_snapshots" ADD CONSTRAINT "aum_snapshots_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benchmark_prices" ADD CONSTRAINT "benchmark_prices_benchmark_id_benchmarks_id_fk" FOREIGN KEY ("benchmark_id") REFERENCES "public"."benchmarks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_accounts" ADD CONSTRAINT "broker_accounts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_balances" ADD CONSTRAINT "broker_balances_broker_account_id_broker_accounts_id_fk" FOREIGN KEY ("broker_account_id") REFERENCES "public"."broker_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_positions" ADD CONSTRAINT "broker_positions_broker_account_id_broker_accounts_id_fk" FOREIGN KEY ("broker_account_id") REFERENCES "public"."broker_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_positions" ADD CONSTRAINT "broker_positions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_transactions" ADD CONSTRAINT "broker_transactions_broker_account_id_broker_accounts_id_fk" FOREIGN KEY ("broker_account_id") REFERENCES "public"."broker_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_transactions" ADD CONSTRAINT "broker_transactions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_assignments" ADD CONSTRAINT "client_portfolio_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_assignments" ADD CONSTRAINT "client_portfolio_assignments_template_id_portfolio_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."portfolio_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_assignments" ADD CONSTRAINT "client_portfolio_assignments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_overrides" ADD CONSTRAINT "client_portfolio_overrides_assignment_id_client_portfolio_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."client_portfolio_assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_overrides" ADD CONSTRAINT "client_portfolio_overrides_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portfolio_overrides" ADD CONSTRAINT "client_portfolio_overrides_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_field_history" ADD CONSTRAINT "contact_field_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_field_history" ADD CONSTRAINT "contact_field_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_portfolio_assignments" ADD CONSTRAINT "contact_portfolio_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_portfolio_assignments" ADD CONSTRAINT "contact_portfolio_assignments_portfolio_id_model_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."model_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_portfolio_assignments" ADD CONSTRAINT "contact_portfolio_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_advisor_id_users_id_fk" FOREIGN KEY ("assigned_advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_metrics_user" ADD CONSTRAINT "daily_metrics_user_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_metrics_user" ADD CONSTRAINT "daily_metrics_user_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instrument_aliases" ADD CONSTRAINT "instrument_aliases_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instruments" ADD CONSTRAINT "instruments_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_files" ADD CONSTRAINT "integration_files_run_id_integration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."integration_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_runs" ADD CONSTRAINT "integration_runs_job_id_integration_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."integration_jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_ai" ADD CONSTRAINT "meeting_ai_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_source_lookup_meeting_source_id_fk" FOREIGN KEY ("source") REFERENCES "public"."lookup_meeting_source"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_log" ADD CONSTRAINT "message_log_related_notification_id_notifications_id_fk" FOREIGN KEY ("related_notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_portfolio_allocations" ADD CONSTRAINT "model_portfolio_allocations_portfolio_id_model_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."model_portfolios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_portfolio_allocations" ADD CONSTRAINT "model_portfolio_allocations_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_portfolio_allocations" ADD CONSTRAINT "model_portfolio_allocations_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_portfolios" ADD CONSTRAINT "model_portfolios_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_audio_file_id_audio_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_lookup_notification_type_id_fk" FOREIGN KEY ("type") REFERENCES "public"."lookup_notification_type"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_stage_history" ADD CONSTRAINT "pipeline_stage_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_stage_history" ADD CONSTRAINT "pipeline_stage_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_benchmark_comparisons" ADD CONSTRAINT "portfolio_benchmark_comparisons_performance_snapshot_id_portfolio_performance_snapshots_id_fk" FOREIGN KEY ("performance_snapshot_id") REFERENCES "public"."portfolio_performance_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_benchmark_comparisons" ADD CONSTRAINT "portfolio_benchmark_comparisons_benchmark_id_benchmarks_id_fk" FOREIGN KEY ("benchmark_id") REFERENCES "public"."benchmarks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_monitoring_details" ADD CONSTRAINT "portfolio_monitoring_details_snapshot_id_portfolio_monitoring_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."portfolio_monitoring_snapshot"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_monitoring_details" ADD CONSTRAINT "portfolio_monitoring_details_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_monitoring_details" ADD CONSTRAINT "portfolio_monitoring_details_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_monitoring_snapshot" ADD CONSTRAINT "portfolio_monitoring_snapshot_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_performance_snapshots" ADD CONSTRAINT "portfolio_performance_snapshots_portfolio_id_model_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."model_portfolios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_rebalance_changes" ADD CONSTRAINT "portfolio_rebalance_changes_rebalance_event_id_portfolio_rebalance_events_id_fk" FOREIGN KEY ("rebalance_event_id") REFERENCES "public"."portfolio_rebalance_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_rebalance_changes" ADD CONSTRAINT "portfolio_rebalance_changes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_rebalance_events" ADD CONSTRAINT "portfolio_rebalance_events_portfolio_id_model_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."model_portfolios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_rebalance_events" ADD CONSTRAINT "portfolio_rebalance_events_executed_by_user_id_users_id_fk" FOREIGN KEY ("executed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_template_lines" ADD CONSTRAINT "portfolio_template_lines_template_id_portfolio_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."portfolio_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_template_lines" ADD CONSTRAINT "portfolio_template_lines_asset_class_lookup_asset_class_id_fk" FOREIGN KEY ("asset_class") REFERENCES "public"."lookup_asset_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_template_lines" ADD CONSTRAINT "portfolio_template_lines_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_templates" ADD CONSTRAINT "portfolio_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prices" ADD CONSTRAINT "prices_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_scheduled_report_id_scheduled_reports_id_fk" FOREIGN KEY ("scheduled_report_id") REFERENCES "public"."scheduled_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "segment_members" ADD CONSTRAINT "segment_members_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "segment_members" ADD CONSTRAINT "segment_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "segments" ADD CONSTRAINT "segments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tag_rules" ADD CONSTRAINT "tag_rules_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tag_rules" ADD CONSTRAINT "tag_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_lookup_task_status_id_fk" FOREIGN KEY ("status") REFERENCES "public"."lookup_task_status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_lookup_priority_id_fk" FOREIGN KEY ("priority") REFERENCES "public"."lookup_priority"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurrence_id_task_recurrences_id_fk" FOREIGN KEY ("recurrence_id") REFERENCES "public"."task_recurrences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_membership_requests" ADD CONSTRAINT "team_membership_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcription_segments" ADD CONSTRAINT "transcription_segments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_channel_preferences" ADD CONSTRAINT "user_channel_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_by_user" ON "activity_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_by_advisor" ON "activity_events" USING btree ("advisor_user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_policies_unique" ON "alert_policies" USING btree ("scope",COALESCE("scope_id"::text, 'global'),"type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_contact" ON "attachments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_note" ON "attachments" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_meeting" ON "attachments" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audio_files_uploaded_by" ON "audio_files" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audio_files_transcribed" ON "audio_files" USING btree ("transcribed_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aum_snapshots_unique" ON "aum_snapshots" USING btree ("contact_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_benchmark_prices_unique" ON "benchmark_prices" USING btree ("benchmark_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_benchmarks_active" ON "benchmarks" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broker_accounts_unique" ON "broker_accounts" USING btree ("broker","account_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broker_balances_unique" ON "broker_balances" USING btree ("broker_account_id","as_of_date","currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_broker_balances_latest" ON "broker_balances" USING btree ("broker_account_id","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broker_positions_unique" ON "broker_positions" USING btree ("broker_account_id","as_of_date","instrument_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bpos_latest" ON "broker_positions" USING btree ("broker_account_id","as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_btx_account_settle" ON "broker_transactions" USING btree ("broker_account_id","settle_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_btx_account_trade" ON "broker_transactions" USING btree ("broker_account_id","trade_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_btx_type_trade" ON "broker_transactions" USING btree ("type","trade_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "client_portfolio_assignments_unique" ON "client_portfolio_assignments" USING btree ("contact_id","template_id","start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpa_active" ON "client_portfolio_assignments" USING btree ("contact_id") WHERE "client_portfolio_assignments"."status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_field_history" ON "contact_field_history" USING btree ("contact_id","changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpa_contact" ON "contact_portfolio_assignments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpa_portfolio" ON "contact_portfolio_assignments" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpa_status" ON "contact_portfolio_assignments" USING btree ("status") WHERE "contact_portfolio_assignments"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contact_tags_unique" ON "contact_tags" USING btree ("contact_id","tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_advisor" ON "contacts" USING btree ("assigned_advisor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_stage" ON "contacts" USING btree ("lifecycle_stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_pipeline_stage" ON "contacts" USING btree ("pipeline_stage_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_touch" ON "contacts" USING btree ("contact_last_touch_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_sla_status" ON "contacts" USING btree ("sla_status","sla_due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_full_name" ON "contacts" USING btree ("full_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_email_unique" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_metrics_user_unique" ON "daily_metrics_user" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_fx_rates_unique" ON "fx_rates" USING btree ("from_currency","to_currency","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "instrument_aliases_unique" ON "instrument_aliases" USING btree ("instrument_id","broker","code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "instruments_symbol_unique" ON "instruments" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_integration_runs_job" ON "integration_runs" USING btree ("job_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_ai_keywords_dummy" ON "meeting_ai" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_tags_unique" ON "meeting_tags" USING btree ("meeting_id","tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meetings_contact_started" ON "meetings" USING btree ("contact_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mpa_portfolio" ON "model_portfolio_allocations" USING btree ("portfolio_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mpa_portfolio_asset" ON "model_portfolio_allocations" USING btree ("portfolio_id","asset_class") WHERE "model_portfolio_allocations"."allocation_type" = 'asset_class';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mpa_portfolio_instrument" ON "model_portfolio_allocations" USING btree ("portfolio_id","instrument_id") WHERE "model_portfolio_allocations"."allocation_type" = 'instrument';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_model_portfolios_created_by" ON "model_portfolios" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_model_portfolios_active" ON "model_portfolios" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "note_tags_unique" ON "note_tags" USING btree ("note_id","tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notes_contact_created" ON "notes" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notes_transcription_status" ON "notes" USING btree ("transcription_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notes_keywords_dummy" ON "notes" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_code_version_unique" ON "notification_templates" USING btree ("code","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_templates_active" ON "notification_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_unread" ON "notifications" USING btree ("user_id","created_at") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_unprocessed" ON "notifications" USING btree ("processed") WHERE "notifications"."processed" = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_snoozed" ON "notifications" USING btree ("user_id","snoozed_until") WHERE "notifications"."snoozed_until" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipeline_history_contact" ON "pipeline_stage_history" USING btree ("contact_id","changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipeline_stages_order" ON "pipeline_stages" USING btree ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pbc_snapshot" ON "portfolio_benchmark_comparisons" USING btree ("performance_snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pms_contact_date" ON "portfolio_monitoring_snapshot" USING btree ("contact_id","as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pps_portfolio_date" ON "portfolio_performance_snapshots" USING btree ("portfolio_id","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pps_unique" ON "portfolio_performance_snapshots" USING btree ("portfolio_id","period","as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prc_event" ON "portfolio_rebalance_changes" USING btree ("rebalance_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pre_portfolio_date" ON "portfolio_rebalance_events" USING btree ("portfolio_id","event_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_prices_unique" ON "prices" USING btree ("instrument_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_date" ON "prices" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sched_reports_next" ON "scheduled_reports" USING btree ("enabled","next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "segment_members_unique" ON "segment_members" USING btree ("segment_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_segment_members_segment" ON "segment_members" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_segment_members_contact" ON "segment_members" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_segments_owner" ON "segments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_segments_dynamic" ON "segments" USING btree ("is_dynamic");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tag_rules_tag" ON "tag_rules" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tag_rules_active" ON "tag_rules" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_scope_name_unique" ON "tags" USING btree ("scope","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_recurrences_next" ON "task_recurrences" USING btree ("next_occurrence","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_status_due" ON "tasks" USING btree ("assigned_to_user_id","status","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_open_due" ON "tasks" USING btree ("due_date") WHERE "tasks"."status" in ('open','in_progress');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_recurrence" ON "tasks" USING btree ("recurrence_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_membership_unique" ON "team_membership" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_membership_requests_unique" ON "team_membership_requests" USING btree ("user_id","manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_channel_preferences_unique" ON "user_channel_preferences" USING btree ("user_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role");