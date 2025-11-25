-- Migration: Bloomberg Terminal - TimescaleDB Tables and Hypertables
-- This migration creates all time-series tables for the Bloomberg Terminal feature
-- and configures them as TimescaleDB hypertables

-- Enable TimescaleDB extension (if not already enabled)
-- Note: This requires superuser permissions. Run manually if migration fails:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB extension could not be created. You may need to run this manually as superuser.';
END $$;

-- ==========================================================
-- Macro Series Catalog
-- ==========================================================
CREATE TABLE IF NOT EXISTS "macro_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" text NOT NULL UNIQUE,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"units" text,
	"country" text NOT NULL,
	"category" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_macro_series_series_id" ON "macro_series" USING btree ("series_id");
CREATE INDEX IF NOT EXISTS "idx_macro_series_provider" ON "macro_series" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_macro_series_country" ON "macro_series" USING btree ("country");

-- ==========================================================
-- Prices Daily (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "prices_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL REFERENCES "instruments"("id"),
	"date" date NOT NULL,
	"open" numeric(18, 6) NOT NULL,
	"high" numeric(18, 6) NOT NULL,
	"low" numeric(18, 6) NOT NULL,
	"close" numeric(18, 6) NOT NULL,
	"adj_close" numeric(18, 6),
	"volume" numeric(20, 0),
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"asof" timestamp with time zone DEFAULT now() NOT NULL,
	"quality_flag" text,
	"revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "prices_daily_unique" ON "prices_daily" USING btree ("asset_id","date");
CREATE INDEX IF NOT EXISTS "idx_prices_daily_date" ON "prices_daily" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_prices_daily_asset" ON "prices_daily" USING btree ("asset_id");
CREATE INDEX IF NOT EXISTS "idx_prices_daily_source" ON "prices_daily" USING btree ("source");

-- Convert to hypertable
-- Note: This requires superuser permissions. If migration fails, run manually as superuser:
-- SELECT create_hypertable('prices_daily', 'date', if_not_exists => TRUE);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'prices_daily'
    ) THEN
      PERFORM create_hypertable('prices_daily', 'date', if_not_exists => TRUE);
    END IF;
  ELSE
    RAISE NOTICE 'TimescaleDB extension not found. Hypertable creation skipped.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for prices_daily. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Prices Intraday (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "prices_intraday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL REFERENCES "instruments"("id"),
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(18, 6) NOT NULL,
	"high" numeric(18, 6) NOT NULL,
	"low" numeric(18, 6) NOT NULL,
	"close" numeric(18, 6) NOT NULL,
	"volume" numeric(20, 0),
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"interval" text NOT NULL,
	"asof" timestamp with time zone DEFAULT now() NOT NULL,
	"quality_flag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "prices_intraday_unique" ON "prices_intraday" USING btree ("asset_id","timestamp","interval");
CREATE INDEX IF NOT EXISTS "idx_prices_intraday_timestamp" ON "prices_intraday" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_prices_intraday_asset" ON "prices_intraday" USING btree ("asset_id");

-- Convert to hypertable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'prices_intraday'
    ) THEN
      PERFORM create_hypertable('prices_intraday', 'timestamp', if_not_exists => TRUE);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for prices_intraday. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Macro Points (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "macro_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL REFERENCES "macro_series"("id"),
	"date" date NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"revision_id" uuid,
	"source_asof" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "macro_points_unique" ON "macro_points" USING btree ("series_id","date");
CREATE INDEX IF NOT EXISTS "idx_macro_points_date" ON "macro_points" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_macro_points_series" ON "macro_points" USING btree ("series_id");

-- Convert to hypertable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'macro_points'
    ) THEN
      PERFORM create_hypertable('macro_points', 'date', if_not_exists => TRUE);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for macro_points. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Yields (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "yields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text NOT NULL,
	"tenor" text NOT NULL,
	"date" date NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "yields_unique" ON "yields" USING btree ("country","tenor","date");
CREATE INDEX IF NOT EXISTS "idx_yields_date" ON "yields" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_yields_country_tenor" ON "yields" USING btree ("country","tenor");

-- Convert to hypertable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'yields'
    ) THEN
      PERFORM create_hypertable('yields', 'date', if_not_exists => TRUE);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for yields. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Filings (SEC EDGAR)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"cik" text NOT NULL,
	"form" text NOT NULL,
	"filed_at" timestamp with time zone NOT NULL,
	"url" text NOT NULL,
	"provider" text DEFAULT 'sec_edgar' NOT NULL,
	"text_vector" tsvector,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_filings_ticker" ON "filings" USING btree ("ticker");
CREATE INDEX IF NOT EXISTS "idx_filings_cik" ON "filings" USING btree ("cik");
CREATE INDEX IF NOT EXISTS "idx_filings_form" ON "filings" USING btree ("form");
CREATE INDEX IF NOT EXISTS "idx_filings_filed_at" ON "filings" USING btree ("filed_at");
-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS "idx_filings_text_vector" ON "filings" USING gin ("text_vector");

-- ==========================================================
-- Events (CNV Hechos Relevantes, etc.)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text NOT NULL,
	"issuer" text,
	"event_type" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"provider" text NOT NULL,
	"text_vector" tsvector,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_events_country" ON "events" USING btree ("country");
CREATE INDEX IF NOT EXISTS "idx_events_issuer" ON "events" USING btree ("issuer");
CREATE INDEX IF NOT EXISTS "idx_events_event_type" ON "events" USING btree ("event_type");
CREATE INDEX IF NOT EXISTS "idx_events_published_at" ON "events" USING btree ("published_at");
-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS "idx_events_text_vector" ON "events" USING gin ("text_vector");

-- ==========================================================
-- FX Rates (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"date" date NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"provider" text NOT NULL,
	"asof" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "fx_rates_unique" ON "fx_rates" USING btree ("base","quote","date");
CREATE INDEX IF NOT EXISTS "idx_fx_rates_date" ON "fx_rates" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_fx_rates_pair" ON "fx_rates" USING btree ("base","quote");

-- Convert to hypertable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'fx_rates'
    ) THEN
      PERFORM create_hypertable('fx_rates', 'date', if_not_exists => TRUE);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for fx_rates. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Crypto Prices (Hypertable)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "crypto_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"volume" numeric(20, 0),
	"exchange" text,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "crypto_prices_unique" ON "crypto_prices" USING btree ("symbol","timestamp","exchange");
CREATE INDEX IF NOT EXISTS "idx_crypto_prices_timestamp" ON "crypto_prices" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_crypto_prices_symbol" ON "crypto_prices" USING btree ("symbol");

-- Convert to hypertable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'crypto_prices'
    ) THEN
      PERFORM create_hypertable('crypto_prices', 'timestamp', if_not_exists => TRUE);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create hypertable for crypto_prices. Error: %', SQLERRM;
END $$;

-- ==========================================================
-- Social Posts (Reddit/X)
-- ==========================================================
CREATE TABLE IF NOT EXISTS "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"post_id" text NOT NULL,
	"author" text,
	"content" text NOT NULL,
	"url" text,
	"score" integer,
	"reply_count" integer,
	"retweet_count" integer,
	"like_count" integer,
	"published_at" timestamp with time zone NOT NULL,
	"symbol" text,
	"subreddit" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_posts_platform_post_id_unique" ON "social_posts" USING btree ("platform","post_id");
CREATE INDEX IF NOT EXISTS "idx_social_posts_published_at" ON "social_posts" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "idx_social_posts_symbol" ON "social_posts" USING btree ("symbol");
CREATE INDEX IF NOT EXISTS "idx_social_posts_platform" ON "social_posts" USING btree ("platform");



