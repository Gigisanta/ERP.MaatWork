/**
 * Handlers CRUD para Instruments
 */

import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { instruments, priceSnapshots } from '@cactus/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type {
  SymbolInfoResponse,
  ExternalCodes,
  PriceBackfillResponse,
} from '../../../types/python-service';
import { isConnectionError } from '../../../types/python-service';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { instrumentsSearchCache } from '../../../utils/performance/cache';
import { PYTHON_SERVICE_URL } from '../utils';

/**
 * POST /instruments
 * Crear instrumento desde Yahoo Finance con fallback
 */
export async function createInstrument(req: Request, res: Response) {
  try {
    const { symbol, backfill_days = 365 } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const symbolUpper = symbol.toUpperCase();

    // Check if instrument already exists
    const existingInstrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbolUpper))
      .limit(1);

    if (existingInstrument.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Instrument already exists',
        data: existingInstrument[0],
      });
    }

    let symbolInfo: SymbolInfoResponse | null = null;
    let usedFallback = false;

    // Try to get symbol info from Python service
    try {
      const infoController = new AbortController();
      const infoTimeout = setTimeout(() => infoController.abort(), 15000);
      const infoResponse = await fetch(`${PYTHON_SERVICE_URL}/prices/info/${symbolUpper}`, {
        signal: infoController.signal,
      });
      clearTimeout(infoTimeout);

      if (!infoResponse.ok) {
        throw new Error(`Failed to get symbol info: ${infoResponse.statusText}`);
      }

      const infoData = (await infoResponse.json()) as {
        success?: boolean;
        data?: SymbolInfoResponse;
        error?: string;
      };

      if (infoData.success && infoData.data && infoData.data.success !== false) {
        symbolInfo = infoData.data;
      } else {
        req.log.warn(
          { symbol: symbolUpper, error: infoData.data?.error || infoData.error },
          'Python service returned error status'
        );
      }
    } catch (fetchError: unknown) {
      const isConnError = isConnectionError(fetchError);

      if (isConnError) {
        const errorType =
          fetchError.code === 'ECONNREFUSED'
            ? 'connection refused (service not running)'
            : fetchError.code === 'ETIMEDOUT' || fetchError.name === 'AbortError'
              ? 'timeout'
              : 'connection error';

        req.log.warn(
          {
            symbol: symbolUpper,
            errorType,
            pythonServiceUrl: PYTHON_SERVICE_URL,
            hint: 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev',
          },
          `Python analytics service unavailable (${errorType}), creating instrument without symbol info`
        );
        usedFallback = true;
      } else {
        throw fetchError;
      }
    }

    // Use minimal data if no Python info
    if (!symbolInfo) {
      symbolInfo = {
        name: symbolUpper,
        currency: 'USD',
        market: 'Unknown',
        sector: null,
        industry: null,
      };
      usedFallback = true;
    }

    // Prepare externalCodes
    const externalCodes: ExternalCodes = {};
    if (symbolInfo.market && symbolInfo.market !== 'Unknown') {
      externalCodes.exchange = symbolInfo.market;
    }

    // Create instrument
    const newInstrument = await db()
      .insert(instruments)
      .values({
        symbol: symbolUpper,
        name: symbolInfo.name || symbolUpper,
        assetClass: 'equity',
        currency: symbolInfo.currency || 'USD',
        externalCodes: externalCodes,
        active: true,
      })
      .returning();

    // Backfill prices (optional)
    let backfillPerformed = false;
    if (!usedFallback) {
      try {
        const backfillController = new AbortController();
        const backfillTimeout = setTimeout(() => backfillController.abort(), 300000);
        const backfillResponse = await fetch(`${PYTHON_SERVICE_URL}/prices/backfill`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbols: [symbolUpper],
            days: backfill_days,
          }),
          signal: backfillController.signal,
        });
        clearTimeout(backfillTimeout);

        if (backfillResponse.ok) {
          const backfillData = (await backfillResponse.json()) as PriceBackfillResponse;

          if (backfillData.success && backfillData.data && backfillData.data[symbolUpper]) {
            const priceRecords = backfillData.data[symbolUpper];

            for (const record of priceRecords) {
              try {
                await db()
                  .insert(priceSnapshots)
                  .values({
                    instrumentId: newInstrument[0].id,
                    asOfDate: record.date,
                    closePrice: record.close_price.toString(),
                    currency: symbolInfo.currency || 'USD',
                    source: 'yfinance',
                  })
                  .onConflictDoNothing();
              } catch (priceError) {
                req.log.warn({ error: priceError, record }, 'Failed to insert price record');
              }
            }
            backfillPerformed = true;
          }
        }
      } catch (backfillError) {
        req.log.warn(
          { error: backfillError, symbol: symbolUpper },
          'Failed to backfill prices, but instrument was created'
        );
      }
    } else {
      req.log.info({ symbol: symbolUpper }, 'Skipping backfill due to fallback mode');
    }

    // Invalidate cache
    instrumentsSearchCache.clear();

    res.status(201).json({
      success: true,
      data: {
        instrument: newInstrument[0],
        message: usedFallback
          ? 'Instrument created successfully (using fallback mode - limited data available)'
          : 'Instrument created successfully',
        backfill_performed: backfillPerformed,
        fallback: usedFallback,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ error, symbol: req.body.symbol }, 'Error creating instrument');

    const isConnError = isConnectionError(error);

    if (isConnError) {
      return res.status(503).json({
        success: false,
        error: 'Instrument creation service temporarily unavailable',
        details:
          'The external service is not available. The instrument can still be created manually with limited data.',
        fallback: false,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create instrument',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /instruments
 * Listar instrumentos con filtros
 */
export async function listInstruments(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = PAGINATION_LIMITS.DEFAULT_PAGE_SIZE,
      search,
      asset_class,
      currency,
      is_active = 'true',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const isActiveFilter = is_active === 'true';

    const conditions = [eq(instruments.active, isActiveFilter)];

    if (search) {
      conditions.push(
        sql`(${instruments.name} ILIKE ${`%${search}%`} OR ${instruments.symbol} ILIKE ${`%${search}%`})`
      );
    }

    if (asset_class) {
      conditions.push(eq(instruments.assetClass, asset_class as string));
    }

    if (currency) {
      conditions.push(eq(instruments.currency, currency as string));
    }

    const instrumentsList = await db()
      .select()
      .from(instruments)
      .where(and(...conditions))
      .orderBy(desc(instruments.createdAt))
      .limit(Number(limit))
      .offset(offset);

    const totalCount = await db()
      .select({ count: sql<number>`count(*)` })
      .from(instruments)
      .where(and(...conditions));

    res.json({
      success: true,
      data: {
        instruments: instrumentsList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount[0]?.count || 0),
          pages: Math.ceil(Number(totalCount[0]?.count || 0) / Number(limit)),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, 'Error fetching instruments');
    res.status(500).json({
      error: 'Failed to fetch instruments',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /instruments/:id
 * Obtener instrumento por ID
 */
export async function getInstrumentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instrument = await db().select().from(instruments).where(eq(instruments.id, id)).limit(1);

    if (instrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found',
      });
    }

    const latestPrice = await db()
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.instrumentId, id))
      .orderBy(desc(priceSnapshots.asOfDate))
      .limit(1);

    res.json({
      success: true,
      data: {
        instrument: instrument[0],
        latest_price: latestPrice[0] || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, 'Error fetching instrument');
    res.status(500).json({
      error: 'Failed to fetch instrument',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * PUT /instruments/:id
 * Actualizar instrumento
 */
export async function updateInstrument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, assetClass, currency, exchange, isActive } = req.body;

    const updatedInstrument = await db()
      .update(instruments)
      .set({
        ...(name && { name }),
        ...(description && { description }),
        ...(assetClass && { assetClass }),
        ...(currency && { currency }),
        ...(exchange && { exchange }),
        ...(isActive !== undefined && { isActive }),
      })
      .where(eq(instruments.id, id))
      .returning();

    if (updatedInstrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found',
      });
    }

    instrumentsSearchCache.clear();

    res.json({
      success: true,
      data: updatedInstrument[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, 'Error updating instrument');
    res.status(500).json({
      error: 'Failed to update instrument',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /instruments/:id
 * Eliminar instrumento (soft delete)
 */
export async function deleteInstrument(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const deletedInstrument = await db()
      .update(instruments)
      .set({ isActive: false })
      .where(eq(instruments.id, id))
      .returning();

    if (deletedInstrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found',
      });
    }

    instrumentsSearchCache.clear();

    res.json({
      success: true,
      message: 'Instrument deactivated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, 'Error deleting instrument');
    res.status(500).json({
      error: 'Failed to delete instrument',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
