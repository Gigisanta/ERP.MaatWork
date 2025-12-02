/**
 * Bloomberg Terminal endpoints for asset data
 *
 * AI_DECISION: Separate router for Bloomberg Terminal asset endpoints
 * Justificación: Bloomberg Terminal is a distinct domain with different data access patterns
 * Impacto: Better code organization, easier to maintain and extend
 */

import { Router } from 'express';
import { db } from '@cactus/db';
import { instruments, pricesDaily, pricesIntraday } from '@cactus/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { cache } from '../middleware/cache';
import { buildCacheKey, REDIS_TTL } from '../config/redis';
import { uuidSchema } from '../utils/common-schemas';
import { logger } from '../utils/logger';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

const getOHLCVQuerySchema = z.object({
  timeframe: z.enum(['1d', '1w', '1m', '3m', '6m', '1y', '1h', '5m', '15m']).default('1d'),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /bloomberg/assets/:symbol/snapshot
 * Get asset snapshot (current price, metrics, signals)
 */
router.get(
  '/assets/:symbol/snapshot',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  cache({
    ttl: REDIS_TTL.ASSET_SNAPSHOT,
    keyPrefix: 'bloomberg:asset:snapshot',
    keyBuilder: (req) => buildCacheKey('bloomberg', 'asset', 'snapshot', req.params.symbol),
  }),
  async (req, res) => {
    try {
      const { symbol } = req.params;

      // Get instrument
      const instrument = await db()
        .select()
        .from(instruments)
        .where(eq(instruments.symbol, symbol.toUpperCase()))
        .limit(1);

      if (instrument.length === 0) {
        return res.status(404).json({
          error: 'Instrument not found',
          symbol,
        });
      }

      const inst = instrument[0];

      // Get latest price
      const latestPrice = await db()
        .select()
        .from(pricesDaily)
        .where(eq(pricesDaily.assetId, inst.id))
        .orderBy(desc(pricesDaily.date))
        .limit(1);

      if (latestPrice.length === 0) {
        return res.status(404).json({
          error: 'No price data available',
          symbol,
        });
      }

      const price = latestPrice[0];

      // Get previous close for change calculation
      const previousPrice = await db()
        .select()
        .from(pricesDaily)
        .where(eq(pricesDaily.assetId, inst.id))
        .orderBy(desc(pricesDaily.date))
        .offset(1)
        .limit(1);

      const change =
        previousPrice.length > 0 ? parseFloat(price.close) - parseFloat(previousPrice[0].close) : 0;
      const changePercent =
        previousPrice.length > 0 ? (change / parseFloat(previousPrice[0].close)) * 100 : 0;

      // Get 52-week high/low
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const yearData = await db()
        .select({
          high: sql<number>`MAX(${pricesDaily.high})`,
          low: sql<number>`MIN(${pricesDaily.low})`,
        })
        .from(pricesDaily)
        .where(
          and(
            eq(pricesDaily.assetId, inst.id),
            gte(pricesDaily.date, oneYearAgo.toISOString().split('T')[0])
          )
        );

      const high52w = yearData[0]?.high ? parseFloat(yearData[0].high) : parseFloat(price.high);
      const low52w = yearData[0]?.low ? parseFloat(yearData[0].low) : parseFloat(price.low);

      // FUTURE_FEATURE: Fundamental metrics from SEC/fundamentals data
      // - Requires: SEC EDGAR API integration or financial data provider (Alpha Vantage, etc.)
      // - Metrics: P/E, EV/EBITDA, ROE, Revenue Growth, Profit Margins
      // - Status: Awaiting data provider integration
      
      // FUTURE_FEATURE: Technical indicators calculated from price history
      // - Can use: analytics-service (cactus_ingestors/utils/technical.py)
      // - Indicators: SMA(20,50,200), EMA, RSI(14), MACD, Bollinger Bands
      // - Status: Python calculations ready, needs API endpoint wrapper

      res.json({
        success: true,
        data: {
          symbol: inst.symbol,
          price: parseFloat(price.close),
          change,
          changePercent,
          volume: price.volume ? parseFloat(price.volume) : 0,
          high52w,
          low52w,
          currency: price.currency,
          source: price.source,
          asof: price.asof.toISOString(),
          // Placeholder for metrics that will be added later
          pe: null,
          evEbitda: null,
          margin: null,
          roe: null,
          debtEbitda: null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching asset snapshot');
      res.status(500).json({
        error: 'Failed to fetch asset snapshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /bloomberg/assets/:symbol/ohlcv
 * Get OHLCV data for an asset
 */
router.get(
  '/assets/:symbol/ohlcv',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({ query: getOHLCVQuerySchema }),
  cache({
    ttl: REDIS_TTL.OHLCV_DAILY,
    keyPrefix: 'bloomberg:asset:ohlcv',
    keyBuilder: (req) =>
      buildCacheKey(
        'bloomberg',
        'asset',
        'ohlcv',
        req.params.symbol,
        typeof req.query.timeframe === 'string' ? req.query.timeframe : '1d',
        typeof req.query.from === 'string' ? req.query.from : 'all',
        typeof req.query.to === 'string' ? req.query.to : 'all'
      ),
  }),
  async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe, from, to } = req.query;

      // Get instrument
      const instrument = await db()
        .select()
        .from(instruments)
        .where(eq(instruments.symbol, symbol.toUpperCase()))
        .limit(1);

      if (instrument.length === 0) {
        return res.status(404).json({
          error: 'Instrument not found',
          symbol,
        });
      }

      const inst = instrument[0];

      // Determine which table to query based on timeframe
      const isIntraday = timeframe === '1h' || timeframe === '5m' || timeframe === '15m';
      const table = isIntraday ? pricesIntraday : pricesDaily;

      // Build conditions
      const conditions = [eq(table.assetId, inst.id)];
      if (from) {
        const dateColumn = isIntraday ? table.timestamp : table.date;
        conditions.push(gte(dateColumn, from as string));
      }
      if (to) {
        const dateColumn = isIntraday ? table.timestamp : table.date;
        conditions.push(lte(dateColumn, to as string));
      }

      // Query data
      const data = await db()
        .select()
        .from(table)
        .where(and(...conditions))
        .orderBy(isIntraday ? desc(table.timestamp) : desc(table.date))
        .limit(10000); // Limit to prevent huge responses

      // Format response
      type PriceRow = typeof pricesIntraday.$inferSelect | typeof pricesDaily.$inferSelect;
      const formatted = data
        .map((row: PriceRow) => {
          const priceRow = row as {
            open: string | number;
            high: string | number;
            low: string | number;
            close: string | number;
            adjClose?: string | number | null;
            volume?: string | number | null;
          };
          return {
            date: isIntraday
              ? (row as typeof pricesIntraday.$inferSelect).timestamp.toISOString()
              : (row as typeof pricesDaily.$inferSelect).date,
            open: parseFloat(String(priceRow.open)),
            high: parseFloat(String(priceRow.high)),
            low: parseFloat(String(priceRow.low)),
            close: parseFloat(String(priceRow.close)),
            adjClose: priceRow.adjClose ? parseFloat(String(priceRow.adjClose)) : undefined,
            volume: priceRow.volume ? parseFloat(String(priceRow.volume)) : 0,
          };
        })
        .reverse(); // Return in chronological order

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching OHLCV data');
      res.status(500).json({
        error: 'Failed to fetch OHLCV data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
