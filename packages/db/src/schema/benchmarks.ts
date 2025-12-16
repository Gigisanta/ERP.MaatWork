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
  check
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { instruments } from './instruments';

/**
 * benchmark_definitions
 * Definición de benchmarks para comparación de carteras.
 */
export const benchmarkDefinitions = pgTable(
  'benchmark_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // MERVAL, IAMC, SP500, CUSTOM_BALANCED
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false), // benchmarks del sistema vs custom
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    benchmarkCodeIdx: index('idx_benchmark_code').on(table.code)
  })
);

/**
 * benchmark_components
 * Componentes de benchmarks (instrumentos con pesos).
 */
export const benchmarkComponents = pgTable(
  'benchmark_components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    benchmarkId: uuid('benchmark_id').notNull().references(() => benchmarkDefinitions.id, { onDelete: 'cascade' }),
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    weight: numeric('weight', { precision: 7, scale: 4 }).notNull(), // para benchmarks compuestos
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    benchmarkComponentsBenchmarkIdx: index('idx_benchmark_components_benchmark').on(table.benchmarkId),
    benchmarkComponentsInstrumentIdx: index('idx_benchmark_components_instrument').on(table.instrumentId),
    benchmarkWeightCheck: check('chk_benchmark_weight', sql`${table.weight} >= 0 and ${table.weight} <= 1`),
    // AI_DECISION: Add composite index for benchmark component queries
    // Justificación: Queries load all components for a benchmark and sort by weight. Composite index speeds up sorting.
    // Impacto: Faster benchmark composition loading
    benchmarkComponentsWeightIdx: index('idx_benchmark_components_weight').on(
      table.benchmarkId,
      table.weight
    )
  })
);

/**
 * price_snapshots
 * Snapshots de precios históricos por instrumento y fecha.
 */
export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instrumentId: uuid('instrument_id').notNull().references(() => instruments.id),
    asOfDate: date('as_of_date').notNull(),
    closePrice: numeric('close_price', { precision: 18, scale: 6 }).notNull(),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, manual
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    priceSnapshotsUnique: uniqueIndex('price_snapshots_unique').on(table.instrumentId, table.asOfDate),
    priceSnapshotsDateIdx: index('idx_price_snapshots_date').on(table.asOfDate),
    priceSnapshotsInstrumentIdx: index('idx_price_snapshots_instrument').on(table.instrumentId)
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
    assetId: uuid('asset_id').notNull().references(() => instruments.id),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pricesDailyUnique: uniqueIndex('prices_daily_unique').on(table.assetId, table.date),
    pricesDailyDateIdx: index('idx_prices_daily_date').on(table.date),
    pricesDailyAssetIdx: index('idx_prices_daily_asset').on(table.assetId),
    pricesDailyAssetDateIdx: index('idx_prices_daily_asset_date').on(table.assetId, table.date)
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
    assetId: uuid('asset_id').notNull().references(() => instruments.id),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    open: numeric('open', { precision: 18, scale: 6 }).notNull(),
    high: numeric('high', { precision: 18, scale: 6 }).notNull(),
    low: numeric('low', { precision: 18, scale: 6 }).notNull(),
    close: numeric('close', { precision: 18, scale: 6 }).notNull(),
    adjClose: numeric('adj_close', { precision: 18, scale: 6 }),
    volume: numeric('volume', { precision: 28, scale: 8 }),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, bloomberg, manual
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pricesIntradayUnique: uniqueIndex('prices_intraday_unique').on(table.assetId, table.timestamp),
    pricesIntradayTimestampIdx: index('idx_prices_intraday_timestamp').on(table.timestamp),
    pricesIntradayAssetIdx: index('idx_prices_intraday_asset').on(table.assetId),
    pricesIntradayAssetTimestampIdx: index('idx_prices_intraday_asset_timestamp').on(table.assetId, table.timestamp)
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
    category: text('category').notNull() // performance, risk, benchmark
  },
  (table) => ({
    metricCodeIdx: index('idx_metric_code').on(table.code),
    metricCategoryIdx: index('idx_metric_category').on(table.category)
  })
);









































