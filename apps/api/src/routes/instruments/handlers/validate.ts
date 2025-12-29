/**
 * Handler para validación de símbolos
 */

import type { Request, Response } from 'express';
import { db } from '@maatwork/db';
import { instruments } from '@maatwork/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
  SymbolValidationResponse,
  SymbolSearchResponse,
  ExternalCodes,
} from '../../../types/python-service';
import { isConnectionError } from '../../../types/python-service';
import { PYTHON_SERVICE_URL } from '../utils';

/**
 * GET /search/validate/:symbol
 * Validar símbolo con fallback a BD
 */
export async function validateSymbol(req: Request, res: Response) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const symbolUpper = symbol.toUpperCase();
    let validationResult: SymbolValidationResponse | null = null;
    let usedFallback = false;

    // Try Python service first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${PYTHON_SERVICE_URL}/search/validate/${symbolUpper}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      const data = (await response.json()) as SymbolSearchResponse;

      if (
        data.status === 'success' &&
        data.data &&
        !Array.isArray(data.data) &&
        'valid' in data.data
      ) {
        validationResult = data.data as SymbolValidationResponse;
      } else if (data.status === 'error') {
        req.log.warn({ symbol, error: data.message }, 'Python service returned error status');
      } else {
        req.log.warn({ symbol, data }, 'Unexpected Python service response format');
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
            symbol,
            errorType,
            pythonServiceUrl: PYTHON_SERVICE_URL,
            hint: 'Analytics service may not be running. Start it with: pnpm -F @maatwork/analytics-service dev',
          },
          `Python analytics service unavailable (${errorType}), using database fallback for validation`
        );
        usedFallback = true;
      } else {
        throw fetchError;
      }
    }

    // DB fallback
    if (!validationResult) {
      try {
        const dbInstrument = await db()
          .select()
          .from(instruments)
          .where(and(eq(instruments.symbol, symbolUpper), eq(instruments.active, true)))
          .limit(1);

        if (dbInstrument.length > 0) {
          const instrument = dbInstrument[0];
          const externalCodes = instrument.externalCodes as ExternalCodes | null;
          const exchange = externalCodes?.exchange || 'Unknown';

          validationResult = {
            valid: true,
            symbol: instrument.symbol,
            name: instrument.name || instrument.symbol,
            exchange: exchange,
            currency: instrument.currency || 'USD',
            type:
              instrument.assetClass === 'equity'
                ? 'EQUITY'
                : instrument.assetClass === 'bond'
                  ? 'BOND'
                  : instrument.assetClass === 'etf'
                    ? 'ETF'
                    : 'EQUITY',
          };
          usedFallback = true;
        } else {
          validationResult = {
            valid: false,
            symbol: symbolUpper,
            error: 'Symbol not found in database',
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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ error, symbol: req.params.symbol }, 'Error validating symbol');

    const isConnError = isConnectionError(error);

    if (isConnError) {
      return res.status(503).json({
        success: false,
        error: 'Validation service temporarily unavailable',
        details: 'The validation service is not available. Please try again later.',
        fallback: false,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to validate symbol',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}








