/**
 * Yield curve data endpoints
 * 
 * AI_DECISION: Separate router for yield data
 * Justificación: Yield curves are a distinct domain with different access patterns
 * Impacto: Better code organization, easier to maintain
 */

import { Router } from 'express';
import { db } from '@cactus/db';
import { yields } from '@cactus/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { cache, REDIS_TTL } from '../middleware/cache';
import { buildCacheKey } from '../config/redis';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

const getYieldsQuerySchema = z.object({
  country: z.enum(['US', 'AR']).optional(),
  date: dateSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  tenor: z.string().optional()
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /yields
 * Get yield curve data
 */
router.get(
  '/',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({ query: getYieldsQuerySchema }),
  cache({
    ttl: REDIS_TTL.YIELD_CURVE,
    keyPrefix: 'yields',
    keyBuilder: (req) => buildCacheKey(
      'yields',
      req.query.country || 'all',
      req.query.date || req.query.from || 'latest',
      req.query.tenor || 'all'
    )
  }),
  async (req, res) => {
    try {
      const { country, date, from, to, tenor } = req.query;
      
      const conditions = [];
      if (country) {
        conditions.push(eq(yields.country, country as string));
      }
      if (date) {
        conditions.push(eq(yields.date, date as string));
      } else {
        if (from) {
          conditions.push(gte(yields.date, from as string));
        }
        if (to) {
          conditions.push(lte(yields.date, to as string));
        }
      }
      if (tenor) {
        conditions.push(eq(yields.tenor, tenor as string));
      }
      
      const yieldsData = await db()
        .select()
        .from(yields)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(yields.date), yields.tenor);
      
      // If specific date requested and no tenor filter, return as curve
      if (date && !tenor && !from && !to) {
        const dateYields = yieldsData.filter(y => y.date === date);
        const curveData: Record<string, { value: number; provider: string }> = {};
        
        dateYields.forEach(y => {
          curveData[y.tenor] = {
            value: parseFloat(y.value),
            provider: y.provider
          };
        });
        
        // Get spreads for this date
        try {
          const spreadsResponse = await getYieldSpreadsInternal(country as string, date);
          const spreads = spreadsResponse?.spreads || {};
          
          return res.json({
            success: true,
            data: {
              date,
              country: country || 'US',
              yields: curveData,
              spreads
            },
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          // Return curve without spreads if spreads calculation fails
          return res.json({
            success: true,
            data: {
              date,
              country: country || 'US',
              yields: curveData
            },
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // If no date specified but country is specified, get latest date and return as curve
      if (!date && !tenor && !from && !to && country) {
        if (yieldsData.length > 0) {
          const latestDate = yieldsData[0].date;
          const dateYields = yieldsData.filter(y => y.date === latestDate);
          const curveData: Record<string, { value: number; provider: string }> = {};
          
          dateYields.forEach(y => {
            curveData[y.tenor] = {
              value: parseFloat(y.value),
              provider: y.provider
            };
          });
          
          // Get spreads for latest date
          try {
            const spreadsResponse = await getYieldSpreadsInternal(country as string, latestDate);
            const spreads = spreadsResponse?.spreads || {};
            
            return res.json({
              success: true,
              data: {
                date: latestDate,
                country: country as string,
                yields: curveData,
                spreads
              },
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            return res.json({
              success: true,
              data: {
                date: latestDate,
                country: country as string,
                yields: curveData
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      res.json({
        success: true,
        data: yieldsData,
        count: yieldsData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching yields:', error);
      res.status(500).json({
        error: 'Failed to fetch yields',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Internal helper to calculate yield spreads
 */
async function getYieldSpreadsInternal(country: string, date?: string): Promise<{ date: string; spreads: Record<string, number>; yields: Record<string, number> } | null> {
  try {
    // Get latest date if not specified
    let targetDate = date;
    if (!targetDate) {
      const latest = await db()
        .select({ date: yields.date })
        .from(yields)
        .where(eq(yields.country, country))
        .orderBy(desc(yields.date))
        .limit(1);
      
      if (latest.length === 0) {
        return null;
      }
      
      targetDate = latest[0].date;
    }
    
    // Get all tenors for the date
    const yieldsData = await db()
      .select()
      .from(yields)
      .where(and(
        eq(yields.country, country),
        eq(yields.date, targetDate)
      ));
    
    // Calculate spreads
    const yieldMap = yieldsData.reduce((acc, y) => {
      acc[y.tenor] = parseFloat(y.value);
      return acc;
    }, {} as Record<string, number>);
    
    const spreads: Record<string, number> = {};
    
    // 2s10s spread (2-year vs 10-year)
    if (yieldMap['2y'] !== undefined && yieldMap['10y'] !== undefined) {
      spreads['2s10s'] = yieldMap['10y'] - yieldMap['2y'];
    }
    
    // 3m-10y spread
    if (yieldMap['3m'] !== undefined && yieldMap['10y'] !== undefined) {
      spreads['3m10y'] = yieldMap['10y'] - yieldMap['3m'];
    }
    
    return {
      date: targetDate,
      spreads,
      yields: yieldMap
    };
  } catch (error) {
    console.error('Error calculating yield spreads:', error);
    return null;
  }
}

/**
 * GET /yields/spreads
 * Get yield spreads (2s10s, 3m-10y, etc.)
 */
router.get(
  '/spreads',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validate({
    query: z.object({
      country: z.enum(['US', 'AR']).default('US'),
      date: dateSchema.optional()
    })
  }),
  cache({
    ttl: REDIS_TTL.YIELD_CURVE,
    keyPrefix: 'yields:spreads',
    keyBuilder: (req) => buildCacheKey('yields', 'spreads', req.query.country || 'US', req.query.date || 'latest')
  }),
  async (req, res) => {
    try {
      const { country, date } = req.query;
      
      const result = await getYieldSpreadsInternal(country as string, date as string | undefined);
      
      if (!result) {
        return res.status(404).json({
          error: 'No yield data found',
          country
        });
      }
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error calculating yield spreads:', error);
      res.status(500).json({
        error: 'Failed to calculate yield spreads',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;



