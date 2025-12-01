/**
 * Macro economic data endpoints
 *
 * AI_DECISION: Separate router for macro data to keep code organized
 * Justificación: Macro data is a distinct domain with different access patterns
 * Impacto: Better code organization, easier to maintain and scale
 */

import { Router } from 'express';
import { db } from '@cactus/db';
import { macroSeries, macroPoints } from '@cactus/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { cache } from '../middleware/cache';
import { buildCacheKey, REDIS_TTL } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

const getSeriesListQuerySchema = z.object({
  provider: z.string().optional(),
  country: z.enum(['US', 'AR']).optional(),
  category: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

const getSeriesQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional().default(1000),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /macro/series
 * List all available macro series
 */
router.get(
  '/series',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({ query: getSeriesListQuerySchema }),
  cache({
    ttl: REDIS_TTL.MACRO_SERIES_LIST,
    keyPrefix: 'macro:series:list',
    keyBuilder: (req) => buildCacheKey('macro', 'series', 'list', JSON.stringify(req.query)),
  }),
  async (req, res) => {
    try {
      const { provider, country, category, active } = req.query;

      const conditions = [];
      if (provider) {
        conditions.push(eq(macroSeries.provider, provider as string));
      }
      if (country) {
        conditions.push(eq(macroSeries.country, country as string));
      }
      if (category) {
        conditions.push(eq(macroSeries.category, category as string));
      }
      if (active !== undefined) {
        conditions.push(eq(macroSeries.active, active === 'true'));
      }

      const series = await db()
        .select()
        .from(macroSeries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(macroSeries.updatedAt));

      res.json({
        success: true,
        data: series,
        count: series.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching macro series');
      res.status(500).json({
        error: 'Failed to fetch macro series',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /macro/:seriesId
 * Get macro series data points
 */
router.get(
  '/:seriesId',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({ query: getSeriesQuerySchema }),
  cache({
    ttl: REDIS_TTL.MACRO_SERIES,
    keyPrefix: 'macro:series',
    keyBuilder: (req) =>
      buildCacheKey(
        'macro',
        'series',
        req.params.seriesId,
        typeof req.query.from === 'string' ? req.query.from : 'all',
        typeof req.query.to === 'string' ? req.query.to : 'all'
      ),
  }),
  async (req, res) => {
    try {
      const { seriesId } = req.params;
      const { from, to, limit } = req.query;

      // First, get the series to get its UUID
      const series = await db()
        .select()
        .from(macroSeries)
        .where(eq(macroSeries.seriesId, seriesId))
        .limit(1);

      if (series.length === 0) {
        return res.status(404).json({
          error: 'Series not found',
          seriesId,
        });
      }

      const seriesUuid = series[0].id;

      // Build conditions for data points
      const conditions = [eq(macroPoints.seriesId, seriesUuid)];
      if (from) {
        conditions.push(gte(macroPoints.date, from as string));
      }
      if (to) {
        conditions.push(lte(macroPoints.date, to as string));
      }

      const points = await db()
        .select()
        .from(macroPoints)
        .where(and(...conditions))
        .orderBy(desc(macroPoints.date))
        .limit(Number(limit));

      res.json({
        success: true,
        data: {
          series: series[0],
          points: points.reverse(), // Return chronological order
        },
        count: points.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching macro series data');
      res.status(500).json({
        error: 'Failed to fetch macro series data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
