/**
 * Handler para búsqueda de instrumentos
 */

import type { Request, Response } from 'express';
import type { SymbolSearchResult, SymbolSearchResponse } from '../../../types/python-service';
import { isConnectionError } from '../../../types/python-service';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { instrumentsSearchCache, normalizeCacheKey } from '../../../utils/cache';
import { PYTHON_SERVICE_URL, searchInstrumentsInDB, type DBInstrumentSearchResult } from '../utils';
import { pythonServiceCircuitBreaker } from '../circuit-breaker';

/**
 * POST /instruments/search
 * Buscar símbolos en Yahoo Finance con fallback a BD
 */
export async function searchInstruments(req: Request, res: Response) {
  try {
    const { query, max_results = PAGINATION_LIMITS.QUICK_SEARCH_LIMIT } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long',
      });
    }

    // Check cache first
    const cacheKey = normalizeCacheKey('instruments:search', query);
    const cached = instrumentsSearchCache.get(cacheKey);
    if (cached) {
      req.log.debug({ query, cacheKey }, 'instrument search served from cache');
      return res.json({
        success: true,
        data: cached,
        fallback: false,
        timestamp: new Date().toISOString(),
        query: query,
        cached: true,
      });
    }

    let pythonResults: SymbolSearchResult[] = [];
    let usedFallback = false;

    try {
      if (pythonServiceCircuitBreaker.isOpen()) {
        req.log.warn(
          {
            circuitState: pythonServiceCircuitBreaker.getState(),
            metrics: pythonServiceCircuitBreaker.getMetrics(),
          },
          'Circuit breaker OPEN - usando fallback a BD'
        );
        usedFallback = true;
        pythonResults = await searchInstrumentsInDB(query, max_results);
      } else {
        try {
          const data = await pythonServiceCircuitBreaker.execute(async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${PYTHON_SERVICE_URL}/search/symbols`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query,
                max_results,
              }),
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`Python service error: ${response.statusText}`);
            }

            const responseData = (await response.json()) as SymbolSearchResponse;
            return responseData;
          });

          if (data.status === 'success' && data.data) {
            if (Array.isArray(data.data)) {
              pythonResults = data.data;
            } else if ('results' in data.data && Array.isArray(data.data.results)) {
              pythonResults = data.data.results;
            }
          } else if (data.status === 'error') {
            req.log.warn({ query, error: data.message }, 'Python service returned error status');
            usedFallback = true;
            pythonResults = await searchInstrumentsInDB(query, max_results);
          } else {
            req.log.warn({ query, data }, 'Unexpected Python service response format');
            usedFallback = true;
            pythonResults = await searchInstrumentsInDB(query, max_results);
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
                query,
                errorType,
                pythonServiceUrl: PYTHON_SERVICE_URL,
                hint: 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev',
              },
              `Python analytics service unavailable (${errorType}), using database fallback`
            );
            usedFallback = true;
            pythonResults = await searchInstrumentsInDB(query, max_results);
          } else {
            throw fetchError;
          }
        }
      }
    } catch (pythonServiceError: unknown) {
      const error =
        pythonServiceError instanceof Error
          ? pythonServiceError
          : new Error(String(pythonServiceError));
      req.log.warn(
        {
          query,
          error: error.message,
          hint: 'Python service error, using database fallback',
        },
        'Python service error, falling back to database'
      );
      usedFallback = true;
      try {
        pythonResults = await searchInstrumentsInDB(query, max_results);
      } catch (dbError: unknown) {
        const dbErr = dbError instanceof Error ? dbError : new Error(String(dbError));
        req.log.error({ query, error: dbErr.message }, 'Database fallback also failed');
        throw dbErr;
      }
    }

    // If no Python results, use DB fallback
    if (pythonResults.length === 0) {
      try {
        const dbResults = await searchInstrumentsInDB(query, max_results);
        pythonResults = dbResults.map((instrument: DBInstrumentSearchResult) => ({
          symbol: instrument.symbol,
          name: instrument.name || instrument.symbol,
          shortName: instrument.shortName || instrument.name || instrument.symbol,
          currency: instrument.currency || 'USD',
          exchange: instrument.exchange || 'Unknown',
          type: instrument.type || 'EQUITY',
          sector: instrument.sector,
          industry: instrument.industry,
        }));
        usedFallback = true;
        req.log.info(
          { query, resultsCount: pythonResults.length },
          'Database fallback search completed successfully'
        );
      } catch (dbError: unknown) {
        const error = dbError instanceof Error ? dbError : new Error(String(dbError));
        req.log.error(
          {
            query,
            error: error.message,
            stack: error.stack,
            code: 'code' in error ? String(error.code) : undefined,
            errno: 'errno' in error ? (error as { errno?: unknown }).errno : undefined,
          },
          'Error searching instruments in database'
        );
        throw error;
      }
    }

    // Cache results
    if (pythonResults.length > 0) {
      instrumentsSearchCache.set(cacheKey, pythonResults);
    }

    res.json({
      success: true,
      data: pythonResults,
      fallback: usedFallback,
      timestamp: new Date().toISOString(),
      query: query,
      hint:
        usedFallback && pythonResults.length === 0
          ? 'El servicio de búsqueda avanzada no está disponible. Verifica que el servicio Python esté corriendo o intenta con un símbolo completo.'
          : undefined,
    });
  } catch (error) {
    req.log.error({ error, query: req.body.query }, 'Error searching instruments');

    const isConnError = isConnectionError(error);

    if (isConnError) {
      return res.status(503).json({
        success: false,
        error: 'Search service temporarily unavailable',
        details:
          'The search service is not available. Please try again later or use direct symbol entry.',
        fallback: false,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to search instruments',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
