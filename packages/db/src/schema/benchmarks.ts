/**
 * Benchmarks, precios y métricas financieras
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { instruments } from './instruments';

// benchmark_definitions and benchmark_components have been unified into portfolios and portfolio_lines
// See packages/db/src/schema/portfolios.ts

/**
 * price_snapshots
 * Snapshots de precios históricos por instrumento y fecha.
 */
export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id),
    asOfDate: date('as_of_date').notNull(),
    closePrice: numeric('close_price', { precision: 18, scale: 6 }).notNull(),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, manual
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    priceSnapshotsUnique: uniqueIndex('price_snapshots_unique').on(
      table.instrumentId,
      table.asOfDate
    ),
    priceSnapshotsDateIdx: index('idx_price_snapshots_date').on(table.asOfDate),
    priceSnapshotsInstrumentIdx: index('idx_price_snapshots_instrument').on(table.instrumentId),
  })
);

/**
 * prices_daily
 * Precios diarios OHLCV (Open, High, Low, Close, Volume) por instrumento y fecha.
 * Usado para análisis técnico y visualización de gráficos diarios.
 */
export const pricesDaily = pgTable(
  'prices_daily',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => instruments.id),
    date: date('date').notNull(),
    open: numeric('open', { precision: 18, scale: 6 }).notNull(),
    high: numeric('high', { precision: 18, scale: 6 }).notNull(),
    low: numeric('low', { precision: 18, scale: 6 }).notNull(),
    close: numeric('close', { precision: 18, scale: 6 }).notNull(),
    adjClose: numeric('adj_close', { precision: 18, scale: 6 }),
    volume: numeric('volume', { precision: 28, scale: 8 }),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, bloomberg, manual
    asof: timestamp('asof', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pricesDailyUnique: uniqueIndex('prices_daily_unique').on(table.assetId, table.date),
    pricesDailyDateIdx: index('idx_prices_daily_date').on(table.date),
    pricesDailyAssetIdx: index('idx_prices_daily_asset').on(table.assetId),
    pricesDailyAssetDateIdx: index('idx_prices_daily_asset_date').on(table.assetId, table.date),
  })
);

/**
 * prices_intraday
 * Precios intraday OHLCV (Open, High, Low, Close, Volume) por instrumento y timestamp.
 * Usado para análisis técnico y visualización de gráficos intraday (1h, 5m, 15m).
 */
export const pricesIntraday = pgTable(
  'prices_intraday',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => instruments.id),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    open: numeric('open', { precision: 18, scale: 6 }).notNull(),
    high: numeric('high', { precision: 18, scale: 6 }).notNull(),
    low: numeric('low', { precision: 18, scale: 6 }).notNull(),
    close: numeric('close', { precision: 18, scale: 6 }).notNull(),
    adjClose: numeric('adj_close', { precision: 18, scale: 6 }),
    volume: numeric('volume', { precision: 28, scale: 8 }),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, bloomberg, manual
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pricesIntradayUnique: uniqueIndex('prices_intraday_unique').on(table.assetId, table.timestamp),
    pricesIntradayTimestampIdx: index('idx_prices_intraday_timestamp').on(table.timestamp),
    pricesIntradayAssetIdx: index('idx_prices_intraday_asset').on(table.assetId),
    pricesIntradayAssetTimestampIdx: index('idx_prices_intraday_asset_timestamp').on(
      table.assetId,
      table.timestamp
    ),
  })
);

/**
 * metric_definitions
 * Catálogo de métricas financieras disponibles.
 */
export const metricDefinitions = pgTable(
  'metric_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // twr, sharpe, volatility, drawdown, alpha, beta, te
    name: text('name').notNull(),
    description: text('description'),
    calculationFormula: text('calculation_formula'), // descripción textual o fórmula
    unit: text('unit').notNull(), // %, ratio, currency
    category: text('category').notNull(), // performance, risk, benchmark
  },
  (table) => ({
    metricCodeIdx: index('idx_metric_code').on(table.code),
    metricCategoryIdx: index('idx_metric_category').on(table.category),
  })
);
