import express, { Request, Response } from 'express';
import { db } from '@cactus/db';
import { instruments, priceSnapshots } from '@cactus/db/schema';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import fetch from 'node-fetch';
import { setTimeout as delay } from 'node:timers/promises';

const router = express.Router();

// URL del microservicio Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

// POST /instruments/search - Buscar símbolos en Yahoo Finance
router.post('/search', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { query, max_results = 10 } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters long'
      });
    }

    // Llamar al microservicio Python para buscar símbolos
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${PYTHON_SERVICE_URL}/search/symbols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    res.json({
      success: true,
      data: data.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error searching instruments');
    res.status(500).json({
      error: 'Failed to search instruments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /search/validate/:symbol - Validar símbolo
router.get('/search/validate/:symbol', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol is required'
      });
    }

    // Llamar al microservicio Python para validar símbolo
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${PYTHON_SERVICE_URL}/search/validate/${symbol}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    res.json({
      success: true,
      data: data.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error validating symbol');
    res.status(500).json({
      error: 'Failed to validate symbol',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /instruments - Crear instrumento desde Yahoo Finance
router.post('/', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { symbol, backfill_days = 365 } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol is required'
      });
    }

    // Verificar si el instrumento ya existe
    const existingInstrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol))
      .limit(1);

    if (existingInstrument.length > 0) {
      return res.status(409).json({
        error: 'Instrument already exists',
        data: existingInstrument[0]
      });
    }

    // Obtener información del símbolo desde Python
    const infoController = new AbortController();
    const infoTimeout = setTimeout(() => infoController.abort(), 15000);
    const infoResponse = await fetch(`${PYTHON_SERVICE_URL}/prices/info/${symbol}`, { signal: infoController.signal });
    clearTimeout(infoTimeout);

    if (!infoResponse.ok) {
      throw new Error(`Failed to get symbol info: ${infoResponse.statusText}`);
    }

    const infoData = await infoResponse.json() as any;

    if (!infoData.success || !infoData.data.success) {
      return res.status(400).json({
        error: 'Invalid symbol or unable to fetch symbol information',
        details: infoData.data.error || 'Unknown error'
      });
    }

    const symbolInfo = infoData.data;

    // Crear el instrumento en la base de datos
    const newInstrument = await db()
      .insert(instruments)
      .values({
        symbol: symbol,
        name: symbolInfo.name || symbol,
        description: `${symbolInfo.sector || 'Unknown'} - ${symbolInfo.industry || 'Unknown'}`,
        assetClass: 'equity', // Por defecto, se puede mejorar después
        currency: symbolInfo.currency || 'USD',
        exchange: symbolInfo.market || 'Unknown',
        isActive: true,
        createdByUserId: user.id
      })
      .returning();

    // Hacer backfill de precios históricos
    try {
      const backfillController = new AbortController();
      const backfillTimeout = setTimeout(() => backfillController.abort(), 300000);
      const backfillResponse = await fetch(`${PYTHON_SERVICE_URL}/prices/backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: [symbol],
          days: backfill_days
        }),
        signal: backfillController.signal
      });
      clearTimeout(backfillTimeout);

      if (backfillResponse.ok) {
        const backfillData = await backfillResponse.json() as any;
        
        // Guardar precios en la base de datos
        if (backfillData.success && backfillData.data[symbol]) {
          const priceRecords = backfillData.data[symbol];
          
          for (const record of priceRecords) {
            try {
              await db()
                .insert(priceSnapshots)
                .values({
                  instrumentId: newInstrument[0].id,
                  asOfDate: record.date,
                  closePrice: record.close_price.toString(),
                  currency: symbolInfo.currency || 'USD',
                  source: 'yfinance'
                })
                .onConflictDoNothing(); // Evitar duplicados
            } catch (priceError) {
              req.log.warn({ error: priceError, record }, 'Failed to insert price record');
            }
          }
        }
      }
    } catch (backfillError) {
      req.log.warn({ error: backfillError }, 'Failed to backfill prices, but instrument was created');
    }

    res.status(201).json({
      success: true,
      data: {
        instrument: newInstrument[0],
        message: 'Instrument created successfully',
        backfill_performed: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error creating instrument');
    res.status(500).json({
      error: 'Failed to create instrument',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /instruments - Listar instrumentos con filtros
router.get('/', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      asset_class, 
      currency,
      exchange,
      is_active = 'true'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const isActiveFilter = is_active === 'true';

    // Construir condiciones de filtro
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

    // Exchange filter removed - field doesn't exist in schema

    // Obtener instrumentos con paginación
    const instrumentsList = await db()
      .select()
      .from(instruments)
      .where(and(...conditions))
      .orderBy(desc(instruments.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Obtener conteo total
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
          pages: Math.ceil(Number(totalCount[0]?.count || 0) / Number(limit))
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error fetching instruments');
    res.status(500).json({
      error: 'Failed to fetch instruments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /instruments/:id - Obtener instrumento por ID
router.get('/:id', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const instrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);

    if (instrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found'
      });
    }

    // Obtener último precio disponible
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
        latest_price: latestPrice[0] || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error fetching instrument');
    res.status(500).json({
      error: 'Failed to fetch instrument',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /instruments/:id - Actualizar instrumento
router.put('/:id', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
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
        ...(isActive !== undefined && { isActive })
      })
      .where(eq(instruments.id, id))
      .returning();

    if (updatedInstrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found'
      });
    }

    res.json({
      success: true,
      data: updatedInstrument[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error updating instrument');
    res.status(500).json({
      error: 'Failed to update instrument',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /instruments/:id - Eliminar instrumento (soft delete)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedInstrument = await db()
      .update(instruments)
      .set({ isActive: false })
      .where(eq(instruments.id, id))
      .returning();

    if (deletedInstrument.length === 0) {
      return res.status(404).json({
        error: 'Instrument not found'
      });
    }

    res.json({
      success: true,
      message: 'Instrument deactivated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error deleting instrument');
    res.status(500).json({
      error: 'Failed to delete instrument',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;



