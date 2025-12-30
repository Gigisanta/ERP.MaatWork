/**
 * Bloomberg Terminal endpoints for asset data
 *
 * AI_DECISION: Separate router for Bloomberg Terminal asset endpoints
 * Justificación: Bloomberg Terminal is a distinct domain with different data access patterns
 * Impacto: Better code organization, easier to maintain and extend
 */

import { Router, type Request } from 'express';
import { db } from '@maatwork/db';
import { instruments, pricesDaily, pricesIntraday } from '@maatwork/db/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { cache } from '../middleware/cache';
import { buildCacheKey, REDIS_TTL } from '../config/redis';
import { createRouteHandler, HttpError } from '../utils/route-handler';
import { PYTHON_SERVICE_URL } from './instruments/utils';

const router = Router();

// ==========================================================
// Helpers
// ==========================================================

async function fetchCurrentPricesFromPython(symbols: string[]) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const response = await fetch(`${PYTHON_SERVICE_URL}/prices/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (e) {
    // Log error but don't fail the request
    return null;
  }
}

async function backfillPricesFromPython(symbols: string[], days: number = 365) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for backfill
    const response = await fetch(`${PYTHON_SERVICE_URL}/prices/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, days }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (e) {
    return null;
  }
}

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

const getOHLCVQuerySchema = z.object({
  timeframe: z.enum(['1d', '1w', '1m', '3m', '6m', '1y', '1h', '5m', '15m']).default('1d'),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

const batchSnapshotsSchema = z.object({
  symbols: z.array(z.string()).min(1).max(50),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /bloomberg/assets/:symbol/snapshot
 * Get asset snapshot (current price, metrics, signals)
 */
router.post(
  '/assets/snapshots-batch',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({ body: batchSnapshotsSchema }),
  createRouteHandler(async (req: Request) => {
    const { symbols } = req.body;

    // Ensure symbols is an array of strings
    if (!Array.isArray(symbols)) {
      return [];
    }

    // Filter out invalid symbols and clean them
    const uniqueSymbols = [...new Set(symbols as string[])]
      .flatMap((s) => (typeof s === 'string' ? s.split(/[\s,]+/) : [])) // Split by space or comma
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim().toUpperCase());

    if (uniqueSymbols.length === 0) {
      return [];
    }

    // 1. Get instruments
    const foundInstruments = await db()
      .select()
      .from(instruments)
      .where(inArray(instruments.symbol, uniqueSymbols));

    if (foundInstruments.length === 0) {
      return [];
    }

    const instrumentIds = foundInstruments.map((i: { id: string }) => i.id);
    const instrumentsMap = new Map(
      foundInstruments.map((i: { id: string; symbol: string }) => [i.id, i])
    );

    // 2. Get latest prices for all instruments (using DISTINCT ON or similar logic via window function or just latest by date)
    // Since we can't easily do "latest per group" efficiently in one simple query without window functions,
    // we'll use a window function approach which is standard in PostgreSQL.
    // However, Drizzle support for window functions is specific.
    // Alternative: Query most recent price for each ID.
    // For simplicity and performance on moderate datasets, we can fetch the last price for each ID.
    // Given the limit of 50 symbols, we can do a query using IN and order by date,
    // but we need the *latest* for *each*.
    // Optimization: Use a lateral join or window function. Here we use a simpler approach:
    // Fetch latest prices where date is recent (last 7 days) for these assets.

    // Using raw SQL for efficient "latest per group" query
    const latestPricesQuery = await db().execute(sql`
      SELECT DISTINCT ON (asset_id) *
      FROM ${pricesDaily}
      WHERE asset_id IN ${instrumentIds}
      ORDER BY asset_id, date DESC
    `);

    // Helper to process prices
    const latestPrices = latestPricesQuery.rows as (typeof pricesDaily.$inferSelect)[];
    const latestPricesMap = new Map(latestPrices.map((p) => [p.assetId, p]));

    // AI_DECISION: Auto-fetch missing prices for batch request
    // Justificación: Ensure portfolio view has data even for new assets
    const missingPriceSymbols: string[] = [];
    const instrumentsWithoutPrice = foundInstruments.filter(
      (inst: { id: string }) => !latestPricesMap.has(inst.id)
    );
    instrumentsWithoutPrice.forEach((inst: { symbol: string }) =>
      missingPriceSymbols.push(inst.symbol)
    );

    if (missingPriceSymbols.length > 0) {
      try {
        const pythonData = await fetchCurrentPricesFromPython(missingPriceSymbols);
        if (pythonData) {
          const newPricesToInsert: (typeof pricesDaily.$inferInsert)[] = [];

          instrumentsWithoutPrice.forEach((inst: { id: string; symbol: string }) => {
            if (pythonData[inst.symbol] && pythonData[inst.symbol].success) {
              const pData = pythonData[inst.symbol];
              const price = parseFloat(pData.price);

              // Mock DB row for immediate display
              const newPrice = {
                assetId: inst.id,
                date: pData.date,
                open: price.toString(),
                high: price.toString(),
                low: price.toString(),
                close: price.toString(),
                volume: '0',
                currency: pData.currency,
                source: 'yfinance',
                asof: new Date(),
                // partial fields sufficient for display
              };

              newPricesToInsert.push(newPrice);
              latestPricesMap.set(inst.id, newPrice as unknown as typeof pricesDaily.$inferSelect);
            }
          });

          if (newPricesToInsert.length > 0) {
            await db().insert(pricesDaily).values(newPricesToInsert).onConflictDoNothing();
          }
        }
      } catch (e) {
        // Continue without new prices
      }
    }

    // 3. Get previous prices for change calculation (2nd latest)
    // This is trickier in batch. We can skip change calculation for batch to keep it fast,
    // or do a slightly more complex query.
    // Let's do a window function query for top 2 prices per asset.
    const lastTwoPricesQuery = await db().execute(sql`
      SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY date DESC) as rn
        FROM ${pricesDaily}
        WHERE asset_id IN ${instrumentIds}
      ) sub
      WHERE rn <= 2
    `);

    const allPrices = lastTwoPricesQuery.rows as (typeof pricesDaily.$inferSelect & {
      rn: number;
    })[];
    const pricesByAsset = new Map<string, typeof allPrices>();

    allPrices.forEach((p) => {
      if (!pricesByAsset.has(p.assetId)) {
        pricesByAsset.set(p.assetId, []);
      }
      pricesByAsset.get(p.assetId)?.push(p);
    });

    // 4. Get 52-week high/low
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const yearStatsQuery = await db().execute(sql`
      SELECT 
        asset_id, 
        MAX(high) as year_high, 
        MIN(low) as year_low 
      FROM ${pricesDaily}
      WHERE asset_id IN ${instrumentIds} 
        AND date >= ${oneYearAgoStr}
      GROUP BY asset_id
    `);

    const yearStatsMap = new Map<string, { high: number; low: number }>(
      (yearStatsQuery.rows as { asset_id: string; year_high: string; year_low: string }[]).map(
        (row) => [row.asset_id, { high: parseFloat(row.year_high), low: parseFloat(row.year_low) }]
      )
    );

    // 5. Construct response
    const results = foundInstruments
      .map((inst: { id: string; symbol: string; name: string; assetClass: string | null }) => {
        const assetPrices = pricesByAsset.get(inst.id) || [];
        const latest = assetPrices.find((p) => p.rn === 1);
        const previous = assetPrices.find((p) => p.rn === 2);

        if (!latest) {
          // Return partial data if no price found
          return {
            symbol: inst.symbol,
            price: null,
            change: null,
            changePercent: null,
            volume: null,
            high52w: null,
            low52w: null,
            currency: 'USD',
            source: 'N/A',
            asof: null,
            pe: null,
            evEbitda: null,
            margin: null,
            roe: null,
            debtEbitda: null,
          };
        }

        const currentPrice = parseFloat(latest.close);
        const previousClose = previous ? parseFloat(previous.close) : currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

        const yearStats = yearStatsMap.get(inst.id);
        const high52w = yearStats?.high || parseFloat(latest.high);
        const low52w = yearStats?.low || parseFloat(latest.low);

        return {
          symbol: inst.symbol,
          price: currentPrice,
          change,
          changePercent,
          volume: latest.volume ? parseFloat(latest.volume) : 0,
          high52w,
          low52w,
          currency: latest.currency,
          source: latest.source,
          asof: new Date(latest.asof).toISOString(),
          // Placeholder metrics
          pe: null,
          evEbitda: null,
          margin: null,
          roe: null,
          debtEbitda: null,
        };
      })
      .filter(Boolean); // Filter out nulls (instruments with no price data)

    return results;
  })
);

/**
 * GET /bloomberg/macro/series
 * List available macro series
 */
router.get(
  '/macro/series',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  cache({
    ttl: REDIS_TTL.LONG_CACHE, // Cache list for a long time
    keyPrefix: 'bloomberg:macro:series',
    keyBuilder: (req) => {
      const country = typeof req.query.country === 'string' ? req.query.country : 'all';
      return buildCacheKey('bloomberg', 'macro', 'series', country);
    },
  }),
  createRouteHandler(async (req: Request) => {
    const { country } = req.query;

    // Mock data for macro series list
    const series = [
      {
        id: 'GDP_YOY',
        name: 'GDP Growth (YoY)',
        country: 'US',
        category: 'Growth',
        units: '%',
        frequency: 'Quarterly',
        description: 'Gross Domestic Product Annual Growth Rate',
      },
      {
        id: 'CPI_YOY',
        name: 'CPI Inflation (YoY)',
        country: 'US',
        category: 'Inflation',
        units: '%',
        frequency: 'Monthly',
        description: 'Consumer Price Index Annual Rate',
      },
      {
        id: 'UNEMP',
        name: 'Unemployment Rate',
        country: 'US',
        category: 'Labor',
        units: '%',
        frequency: 'Monthly',
        description: 'U3 Unemployment Rate',
      },
      {
        id: 'FED_RATE',
        name: 'Fed Funds Rate',
        country: 'US',
        category: 'Rates',
        units: '%',
        frequency: 'Daily',
        description: 'Federal Funds Effective Rate',
      },
      {
        id: 'AR_GDP_YOY',
        name: 'GDP Growth (YoY)',
        country: 'AR',
        category: 'Growth',
        units: '%',
        frequency: 'Quarterly',
        description: 'Gross Domestic Product Annual Growth Rate',
      },
      {
        id: 'AR_CPI_YOY',
        name: 'CPI Inflation (YoY)',
        country: 'AR',
        category: 'Inflation',
        units: '%',
        frequency: 'Monthly',
        description: 'Consumer Price Index Annual Rate',
      },
    ];

    if (country) {
      return series.filter((s) => s.country === country);
    }
    return series;
  })
);

/**
 * GET /bloomberg/macro/:seriesId
 * Get macro series data
 */
router.get(
  '/macro/:seriesId',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  cache({
    ttl: REDIS_TTL.DAILY,
    keyPrefix: 'bloomberg:macro:data',
    keyBuilder: (req) => buildCacheKey('bloomberg', 'macro', req.params.seriesId),
  }),
  createRouteHandler(async (req: Request) => {
    const { seriesId } = req.params;

    // Mock data generator based on series ID
    const generatePoints = (id: string) => {
      const points = [];
      const now = new Date();
      const years = 5;

      let baseValue = 2.0;
      let volatility = 0.1;

      if (id.includes('CPI')) baseValue = 3.5;
      if (id.includes('UNEMP')) baseValue = 4.0;
      if (id.includes('FED')) baseValue = 5.25;
      if (id.includes('AR')) {
        baseValue *= 10;
        volatility *= 5;
      } // Higher stats for AR

      for (let i = 0; i < 12 * years; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);

        // Add some randomness and trend
        const random = (Math.random() - 0.5) * volatility;
        const trend = Math.sin(i / 10) * baseValue * 0.2;

        points.push({
          date: date.toISOString().split('T')[0],
          value: Math.max(0, baseValue + trend + random),
        });
      }
      return points.reverse();
    };

    return {
      series: { id: seriesId, name: seriesId }, // Simplified metadata
      points: generatePoints(seriesId),
    };
  })
);

/**
 * GET /bloomberg/yields
 * Get yield curve data
 */
router.get(
  '/yields',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  cache({
    ttl: REDIS_TTL.HOURLY,
    keyPrefix: 'bloomberg:yields',
    keyBuilder: (req) => buildCacheKey('bloomberg', 'yields', String(req.query.country || 'US')),
  }),
  createRouteHandler(async (req: Request) => {
    const country = typeof req.query.country === 'string' ? req.query.country : 'US';

    // Mock yield curve data
    const tenors = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];
    const baseRate = country === 'US' ? 5.25 : 40.0;
    const curveShape = country === 'US' ? -0.5 : 10.0; // Inverted for US, steep for AR?

    const yields: Record<string, { tenor: string; value: number; provider: string }> = {};

    tenors.forEach((tenor, i) => {
      // Simple curve simulation
      const maturity = i / tenors.length; // 0 to 1
      const rate = baseRate + maturity * curveShape + Math.random() * 0.1;

      yields[tenor] = {
        tenor,
        value: rate,
        provider: 'MockSource',
      };
    });

    return {
      date: new Date().toISOString().split('T')[0],
      country,
      yields,
    };
  })
);

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
  createRouteHandler(async (req: Request) => {
    const { symbol } = req.params;

    // Get instrument
    const instrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol.toUpperCase()))
      .limit(1);

    if (instrument.length === 0) {
      throw new HttpError(404, 'Instrument not found', { symbol });
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
      // AI_DECISION: Try to fetch from Python service if DB is empty
      // Justificación: Auto-heal missing data using external provider (Yahoo Finance via Analytics Service)
      // Impacto: significantly improved data availability without manual backfill
      try {
        const pythonData = await fetchCurrentPricesFromPython([inst.symbol]);

        if (pythonData && pythonData[inst.symbol] && pythonData[inst.symbol].success) {
          const pData = pythonData[inst.symbol];
          const price = parseFloat(pData.price);

          // Insert into DB to cache it
          await db()
            .insert(pricesDaily)
            .values({
              assetId: inst.id,
              date: pData.date,
              open: price.toString(),
              high: price.toString(),
              low: price.toString(),
              close: price.toString(),
              volume: '0',
              currency: pData.currency,
              source: 'yfinance',
            })
            .onConflictDoNothing();

          return {
            symbol: inst.symbol,
            price: price,
            change: 0, // No history for change
            changePercent: 0,
            volume: 0,
            high52w: price,
            low52w: price,
            currency: pData.currency,
            source: 'yfinance',
            asof: new Date().toISOString(), // Current fetch
            pe: null,
            evEbitda: null,
            margin: null,
            roe: null,
            debtEbitda: null,
          };
        }
      } catch (e) {
        // Ignore error and fall through to empty return
      }

      // AI_DECISION: Return partial data for assets without price history
      // Justificación: Avoid 404 errors for valid assets that just lack price data (e.g. new assets)
      // Impacto: Frontend can render asset info without erroring
      return {
        symbol: inst.symbol,
        price: null,
        change: null,
        changePercent: null,
        volume: null,
        high52w: null,
        low52w: null,
        currency: 'USD', // Default or from instrument if available
        source: 'N/A',
        asof: null,
        pe: null,
        evEbitda: null,
        margin: null,
        roe: null,
        debtEbitda: null,
      };
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
    // - Can use: analytics-service (maatwork_ingestors/utils/technical.py)
    // - Indicators: SMA(20,50,200), EMA, RSI(14), MACD, Bollinger Bands
    // - Status: Python calculations ready, needs API endpoint wrapper

    return {
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
    };
  })
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
  createRouteHandler(async (req: Request) => {
    const { symbol } = req.params;
    const { timeframe, from, to } = req.query;

    // Get instrument
    const instrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol.toUpperCase()))
      .limit(1);

    if (instrument.length === 0) {
      throw new HttpError(404, 'Instrument not found', { symbol });
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
    let data = await db()
      .select()
      .from(table)
      .where(and(...conditions))
      .orderBy(isIntraday ? desc(table.timestamp) : desc(table.date))
      .limit(10000); // Limit to prevent huge responses

    // AI_DECISION: Auto-backfill if no data found for daily timeframe
    // Justificación: Improve data availability by fetching from external source on demand
    // Impacto: Users see charts even if DB was empty
    if (data.length === 0 && !isIntraday) {
      try {
        const backfillData = await backfillPricesFromPython([inst.symbol], 365);
        if (backfillData && backfillData[inst.symbol] && backfillData[inst.symbol].length > 0) {
          interface PythonPricePoint {
            date: string;
            close_price: number | string;
            volume?: number | string;
          }
          const values = (backfillData[inst.symbol] as PythonPricePoint[]).map((p) => ({
            assetId: inst.id,
            date: p.date,
            open: p.close_price.toString(), // Approximate OHLC with Close
            high: p.close_price.toString(),
            low: p.close_price.toString(),
            close: p.close_price.toString(),
            volume: p.volume ? p.volume.toString() : '0',
            currency: 'USD',
            source: 'yfinance',
          }));

          // Insert in chunks to avoid query size limits
          const chunkSize = 100;
          for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize);
            await db().insert(pricesDaily).values(chunk).onConflictDoNothing();
          }

          // Re-query data
          data = await db()
            .select()
            .from(table)
            .where(and(...conditions))
            .orderBy(desc(table.date))
            .limit(10000);
        }
      } catch (e) {
        // Continue with empty data
      }
    }

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

    return {
      data: formatted,
      count: formatted.length,
    };
  })
);

export default router;
