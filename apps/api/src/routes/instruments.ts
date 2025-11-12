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

// Helper: Buscar instrumentos en base de datos como fallback
async function searchInstrumentsInDB(query: string, maxResults: number) {
  const queryUpper = query.toUpperCase().trim();
  const queryPattern = `%${queryUpper}%`;
  
  // Buscar por símbolo que empiece con la query (prioridad) o contenga la query
  // También buscar por nombre que contenga la query
  const results = await db()
    .select({
      symbol: instruments.symbol,
      name: instruments.name,
      shortName: instruments.name,
      currency: instruments.currency,
      assetClass: instruments.assetClass,
      externalCodes: instruments.externalCodes,
      type: sql<string>`CASE 
        WHEN ${instruments.assetClass} = 'equity' THEN 'EQUITY'
        WHEN ${instruments.assetClass} = 'bond' THEN 'BOND'
        WHEN ${instruments.assetClass} = 'etf' THEN 'ETF'
        ELSE 'EQUITY'
      END`,
      sector: sql<string | null>`NULL`,
      industry: sql<string | null>`NULL`
    })
    .from(instruments)
    .where(
      and(
        eq(instruments.active, true),
        sql`(
          ${instruments.symbol} ILIKE ${queryPattern} 
          OR ${instruments.name} ILIKE ${queryPattern}
          OR ${instruments.symbol} ILIKE ${`${queryUpper}%`}
        )`
      )
    )
    .orderBy(
      // Priorizar símbolos que empiezan con la query, luego los que contienen
      sql`CASE 
        WHEN ${instruments.symbol} ILIKE ${`${queryUpper}%`} THEN 1
        WHEN ${instruments.symbol} ILIKE ${queryPattern} THEN 2
        ELSE 3
      END`
    )
    .limit(maxResults);

  // Mapear resultados y extraer exchange de externalCodes
  return results.map(instrument => {
    const externalCodes = instrument.externalCodes as Record<string, any> | null;
    const exchange = externalCodes?.exchange || 'Unknown';
    
    return {
      symbol: instrument.symbol,
      name: instrument.name,
      shortName: instrument.shortName,
      currency: instrument.currency,
      exchange: exchange,
      type: instrument.type,
      sector: instrument.sector,
      industry: instrument.industry
    };
  });
}

// POST /instruments/search - Buscar símbolos en Yahoo Finance con fallback a BD
router.post('/search', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { query, max_results = 10 } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    }

    let pythonResults: any[] = [];
    let usedFallback = false;

    // Intentar llamar al microservicio Python primero
    try {
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

      // Validar formato de respuesta Python
      if (data.status === 'success' && data.data && Array.isArray(data.data.results)) {
        pythonResults = data.data.results;
      } else if (data.status === 'success' && Array.isArray(data.data)) {
        // Formato alternativo: data.data es directamente un array
        pythonResults = data.data;
      } else if (data.status === 'error') {
        req.log.warn({ query, error: data.message }, 'Python service returned error status');
        // Continuar con fallback
      } else {
        req.log.warn({ query, data }, 'Unexpected Python service response format');
        // Continuar con fallback
      }
    } catch (fetchError: any) {
      // Detectar errores de conexión específicos
      const isConnectionError = 
        fetchError.code === 'ECONNREFUSED' ||
        fetchError.code === 'ETIMEDOUT' ||
        fetchError.name === 'AbortError' ||
        (fetchError.message && (
          fetchError.message.includes('ECONNREFUSED') ||
          fetchError.message.includes('ETIMEDOUT') ||
          fetchError.message.includes('timeout') ||
          fetchError.message.includes('fetch failed')
        ));

      if (isConnectionError) {
        const errorType = fetchError.code === 'ECONNREFUSED' 
          ? 'connection refused (service not running)' 
          : fetchError.code === 'ETIMEDOUT' || fetchError.name === 'AbortError'
          ? 'timeout'
          : 'connection error';
        
        req.log.warn({ 
          query, 
          errorType,
          pythonServiceUrl: PYTHON_SERVICE_URL,
          hint: 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev'
        }, `Python analytics service unavailable (${errorType}), using database fallback`);
        usedFallback = true;
      } else {
        // Error no relacionado con conexión, propagar
        throw fetchError;
      }
    }

    // Si no hay resultados de Python, usar fallback a BD
    if (pythonResults.length === 0) {
      try {
        const dbResults = await searchInstrumentsInDB(query, max_results);
        pythonResults = dbResults.map(instrument => ({
          symbol: instrument.symbol,
          name: instrument.name || instrument.symbol,
          shortName: instrument.shortName || instrument.name || instrument.symbol,
          currency: instrument.currency || 'USD',
          exchange: instrument.exchange || 'Unknown',
          type: instrument.type || 'EQUITY',
          sector: instrument.sector,
          industry: instrument.industry
        }));
        usedFallback = true;
        req.log.info({ query, resultsCount: pythonResults.length }, 'Database fallback search completed successfully');
      } catch (dbError: any) {
        req.log.error({ 
          query, 
          error: dbError?.message || String(dbError),
          stack: dbError?.stack,
          code: dbError?.code,
          errno: dbError?.errno
        }, 'Error searching instruments in database');
        throw dbError;
      }
    }

    res.json({
      success: true,
      data: pythonResults,
      fallback: usedFallback,
      timestamp: new Date().toISOString(),
      query: query,
      // Incluir hint si se usó fallback y no hay resultados
      hint: usedFallback && pythonResults.length === 0 
        ? 'El servicio de búsqueda avanzada no está disponible. Verifica que el servicio Python esté corriendo o intenta con un símbolo completo.'
        : undefined
    });

  } catch (error) {
    req.log.error({ error, query: req.body.query }, 'Error searching instruments');
    
    // Detectar errores de conexión para retornar 503
    const isConnectionError = error instanceof Error && (
      (error as any).code === 'ECONNREFUSED' ||
      (error as any).code === 'ETIMEDOUT' ||
      error.name === 'AbortError' ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    );

    if (isConnectionError) {
      return res.status(503).json({
        success: false,
        error: 'Search service temporarily unavailable',
        details: 'The search service is not available. Please try again later or use direct symbol entry.',
        fallback: false
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to search instruments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /search/validate/:symbol - Validar símbolo con fallback a BD
router.get('/search/validate/:symbol', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    const symbolUpper = symbol.toUpperCase();
    let validationResult: any = null;
    let usedFallback = false;

    // Intentar llamar al microservicio Python primero
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${PYTHON_SERVICE_URL}/search/validate/${symbolUpper}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Validar formato de respuesta Python
      if (data.status === 'success' && data.data) {
        validationResult = data.data;
      } else if (data.status === 'error') {
        req.log.warn({ symbol, error: data.message }, 'Python service returned error status');
        // Continuar con fallback
      } else {
        req.log.warn({ symbol, data }, 'Unexpected Python service response format');
        // Continuar con fallback
      }
    } catch (fetchError: any) {
      // Detectar errores de conexión específicos
      const isConnectionError = 
        fetchError.code === 'ECONNREFUSED' ||
        fetchError.code === 'ETIMEDOUT' ||
        fetchError.name === 'AbortError' ||
        (fetchError.message && (
          fetchError.message.includes('ECONNREFUSED') ||
          fetchError.message.includes('ETIMEDOUT') ||
          fetchError.message.includes('timeout') ||
          fetchError.message.includes('fetch failed')
        ));

      if (isConnectionError) {
        const errorType = fetchError.code === 'ECONNREFUSED' 
          ? 'connection refused (service not running)' 
          : fetchError.code === 'ETIMEDOUT' || fetchError.name === 'AbortError'
          ? 'timeout'
          : 'connection error';
        
        req.log.warn({ 
          symbol, 
          errorType,
          pythonServiceUrl: PYTHON_SERVICE_URL,
          hint: 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev'
        }, `Python analytics service unavailable (${errorType}), using database fallback for validation`);
        usedFallback = true;
      } else {
        // Error no relacionado con conexión, propagar
        throw fetchError;
      }
    }

    // Si no hay resultado de Python, buscar en BD
    if (!validationResult) {
      try {
        const dbInstrument = await db()
          .select()
          .from(instruments)
          .where(and(
            eq(instruments.symbol, symbolUpper),
            eq(instruments.active, true)
          ))
          .limit(1);

        if (dbInstrument.length > 0) {
          const instrument = dbInstrument[0];
          // Extraer exchange de externalCodes si está disponible
          const externalCodes = instrument.externalCodes as Record<string, any> | null;
          const exchange = externalCodes?.exchange || 'Unknown';
          
          validationResult = {
            valid: true,
            symbol: instrument.symbol,
            name: instrument.name || instrument.symbol,
            exchange: exchange,
            currency: instrument.currency || 'USD',
            type: instrument.assetClass === 'equity' ? 'EQUITY' : 
                  instrument.assetClass === 'bond' ? 'BOND' : 
                  instrument.assetClass === 'etf' ? 'ETF' : 'EQUITY'
          };
          usedFallback = true;
        } else {
          validationResult = {
            valid: false,
            symbol: symbolUpper,
            error: 'Symbol not found in database'
          };
          usedFallback = true;
        }
      } catch (dbError) {
        req.log.error({ symbol, error: dbError }, 'Error validating symbol in database');
        throw dbError;
      }
    }

    res.json({
      success: true,
      data: validationResult,
      fallback: usedFallback,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error({ error, symbol: req.params.symbol }, 'Error validating symbol');
    
    // Detectar errores de conexión para retornar 503
    const isConnectionError = error instanceof Error && (
      (error as any).code === 'ECONNREFUSED' ||
      (error as any).code === 'ETIMEDOUT' ||
      error.name === 'AbortError' ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    );

    if (isConnectionError) {
      return res.status(503).json({
        success: false,
        error: 'Validation service temporarily unavailable',
        details: 'The validation service is not available. Please try again later.',
        fallback: false
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to validate symbol',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /instruments - Crear instrumento desde Yahoo Finance con fallback
router.post('/', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { symbol, backfill_days = 365 } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    const symbolUpper = symbol.toUpperCase();

    // Verificar si el instrumento ya existe
    const existingInstrument = await db()
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbolUpper))
      .limit(1);

    if (existingInstrument.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Instrument already exists',
        data: existingInstrument[0]
      });
    }

    let symbolInfo: any = null;
    let usedFallback = false;

    // Intentar obtener información del símbolo desde Python
    try {
      const infoController = new AbortController();
      const infoTimeout = setTimeout(() => infoController.abort(), 15000);
      const infoResponse = await fetch(`${PYTHON_SERVICE_URL}/prices/info/${symbolUpper}`, { signal: infoController.signal });
      clearTimeout(infoTimeout);

      if (!infoResponse.ok) {
        throw new Error(`Failed to get symbol info: ${infoResponse.statusText}`);
      }

      const infoData = await infoResponse.json() as any;

      if (infoData.success && infoData.data && infoData.data.success) {
        symbolInfo = infoData.data;
      } else {
        req.log.warn({ symbol: symbolUpper, error: infoData.data?.error }, 'Python service returned error status');
        // Continuar con fallback
      }
    } catch (fetchError: any) {
      // Detectar errores de conexión específicos
      const isConnectionError = 
        fetchError.code === 'ECONNREFUSED' ||
        fetchError.code === 'ETIMEDOUT' ||
        fetchError.name === 'AbortError' ||
        (fetchError.message && (
          fetchError.message.includes('ECONNREFUSED') ||
          fetchError.message.includes('ETIMEDOUT') ||
          fetchError.message.includes('timeout') ||
          fetchError.message.includes('fetch failed')
        ));

      if (isConnectionError) {
        const errorType = fetchError.code === 'ECONNREFUSED' 
          ? 'connection refused (service not running)' 
          : fetchError.code === 'ETIMEDOUT' || fetchError.name === 'AbortError'
          ? 'timeout'
          : 'connection error';
        
        req.log.warn({ 
          symbol: symbolUpper, 
          errorType,
          pythonServiceUrl: PYTHON_SERVICE_URL,
          hint: 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev'
        }, `Python analytics service unavailable (${errorType}), creating instrument without symbol info`);
        usedFallback = true;
      } else {
        // Error no relacionado con conexión, propagar
        throw fetchError;
      }
    }

    // Si no hay información de Python, crear con datos mínimos
    if (!symbolInfo) {
      symbolInfo = {
        name: symbolUpper,
        currency: 'USD',
        market: 'Unknown',
        sector: null,
        industry: null
      };
      usedFallback = true;
    }

    // Preparar externalCodes con exchange si está disponible
    const externalCodes: Record<string, any> = {};
    if (symbolInfo.market && symbolInfo.market !== 'Unknown') {
      externalCodes.exchange = symbolInfo.market;
    }

    // Crear el instrumento en la base de datos
    const newInstrument = await db()
      .insert(instruments)
      .values({
        symbol: symbolUpper,
        name: symbolInfo.name || symbolUpper,
        assetClass: 'equity', // Por defecto, se puede mejorar después
        currency: symbolInfo.currency || 'USD',
        externalCodes: externalCodes,
        active: true
      })
      .returning();

    // Hacer backfill de precios históricos (opcional, no bloquea creación)
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
            days: backfill_days
          }),
          signal: backfillController.signal
        });
        clearTimeout(backfillTimeout);

        if (backfillResponse.ok) {
          const backfillData = await backfillResponse.json() as any;
          
          // Guardar precios en la base de datos
          if (backfillData.success && backfillData.data[symbolUpper]) {
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
                    source: 'yfinance'
                  })
                  .onConflictDoNothing(); // Evitar duplicados
              } catch (priceError) {
                req.log.warn({ error: priceError, record }, 'Failed to insert price record');
              }
            }
            backfillPerformed = true;
          }
        }
      } catch (backfillError) {
        req.log.warn({ error: backfillError, symbol: symbolUpper }, 'Failed to backfill prices, but instrument was created');
      }
    } else {
      req.log.info({ symbol: symbolUpper }, 'Skipping backfill due to fallback mode');
    }

    res.status(201).json({
      success: true,
      data: {
        instrument: newInstrument[0],
        message: usedFallback 
          ? 'Instrument created successfully (using fallback mode - limited data available)' 
          : 'Instrument created successfully',
        backfill_performed: backfillPerformed,
        fallback: usedFallback
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error({ error, symbol: req.body.symbol }, 'Error creating instrument');
    
    // Detectar errores de conexión para retornar 503
    const isConnectionError = error instanceof Error && (
      (error as any).code === 'ECONNREFUSED' ||
      (error as any).code === 'ETIMEDOUT' ||
      error.name === 'AbortError' ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    );

    if (isConnectionError) {
      return res.status(503).json({
        success: false,
        error: 'Instrument creation service temporarily unavailable',
        details: 'The external service is not available. The instrument can still be created manually with limited data.',
        fallback: false
      });
    }

    res.status(500).json({
      success: false,
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



