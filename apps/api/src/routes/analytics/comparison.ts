/**
 * Analytics Comparison Routes
 *
 * Handles portfolio/benchmark comparison operations
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@maatwork/db';
import {
  portfolios,
  portfolioLines,
  instruments,
} from '@maatwork/db/schema';
import { eq, sql, inArray, and } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { getPortfolioCompareTimeout } from '../../config/timeouts';

const router = Router();

// URL del microservicio Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /analytics/compare - Comparar múltiples carteras/benchmarks
 * AI_DECISION: Usar servicio Python para comparación profesional
 * Justificación: Cálculos más precisos con pandas/numpy, normalización automática a base 100
 * Impacto: Eliminación de código N+1 queries, mejor performance y precisión
 */
router.post(
  '/compare',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const { portfolioIds = [], benchmarkIds = [], period = '1Y' } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (portfolioIds.length === 0 && benchmarkIds.length === 0) {
        return res.status(400).json({
          error: 'At least one portfolio or benchmark ID is required',
        });
      }

      const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          error: 'Invalid period. Valid periods: 1M, 3M, 6M, 1Y, YTD, ALL',
        });
      }

      // Obtener datos de todas las carteras y benchmarks en paralelo
      interface PortfolioToCompare {
        id: string;
        name: string;
        type: 'portfolio' | 'benchmark';
        components: Array<{ symbol: string; weight: number; name: string }>;
      }
      const portfoliosToCompare: PortfolioToCompare[] = [];

      // Procesar portfolios - Batch query optimizada (1 query en lugar de N)
      if (portfolioIds.length > 0) {
        try {
          const allPortfolioData = await db()
            .select({
              portfolioId: portfolios.id,
              portfolioName: portfolios.name,
              instrumentSymbol: instruments.symbol,
              weight: portfolioLines.targetWeight,
              instrumentName: instruments.name,
            })
            .from(portfolios)
            .innerJoin(
              portfolioLines,
              eq(portfolioLines.portfolioId, portfolios.id)
            )
            .innerJoin(instruments, eq(instruments.id, portfolioLines.instrumentId))
            .where(and(eq(portfolios.type, 'portfolio'), inArray(portfolios.id, portfolioIds)));


          // Agrupar por portfolioId
          type PortfolioDataRow = {
            portfolioId: string;
            portfolioName: string;
            instrumentSymbol: string;
            weight: string | number;
            instrumentName: string;
          };

          const portfolioDataById: Record<string, PortfolioDataRow[]> = {};
          allPortfolioData.forEach((row: PortfolioDataRow) => {
            if (!portfolioDataById[row.portfolioId]) {
              portfolioDataById[row.portfolioId] = [];
            }
            portfolioDataById[row.portfolioId].push(row);
          });

          // Crear objetos de portfolio
          portfolioIds.forEach((portfolioId: string) => {
            const portfolioData = portfolioDataById[portfolioId];
            if (portfolioData && portfolioData.length > 0) {
              portfoliosToCompare.push({
                id: portfolioId,
                name: portfolioData[0]?.portfolioName || `Portfolio ${portfolioId}`,
                type: 'portfolio',
                components: portfolioData
                  .filter(
                    (line: PortfolioDataRow) =>
                      line.instrumentSymbol && !line.instrumentSymbol.includes(' ')
                  )
                  .map((line: PortfolioDataRow) => ({
                    symbol: line.instrumentSymbol,
                    weight: Number(line.weight),
                    name: line.instrumentName,
                  })),
              });
            }
          });
        } catch (error) {
          req.log.warn({ error, portfolioIds }, 'Failed to fetch portfolio data');
        }
      }

      // Procesar benchmarks - Batch query optimizada (1 query en lugar de N)
      if (benchmarkIds.length > 0) {
        try {
          const allBenchmarkData = await db()
            .select({
              benchmarkId: portfolios.id,
              benchmarkName: portfolios.name,
              instrumentSymbol: instruments.symbol,
              weight: portfolioLines.targetWeight,
              instrumentName: instruments.name,
            })
            .from(portfolios)
            .innerJoin(
              portfolioLines,
              eq(portfolioLines.portfolioId, portfolios.id)
            )
            .innerJoin(instruments, eq(instruments.id, portfolioLines.instrumentId))
            .where(and(eq(portfolios.type, 'benchmark'), inArray(portfolios.id, benchmarkIds)));

          // Agrupar por benchmarkId
          type BenchmarkDataRow = {
            benchmarkId: string;
            benchmarkName: string;
            instrumentSymbol: string;
            weight: string | number;
            instrumentName: string;
          };

          const benchmarkDataById: Record<string, BenchmarkDataRow[]> = {};
          allBenchmarkData.forEach((row: BenchmarkDataRow) => {
            if (!benchmarkDataById[row.benchmarkId]) {
              benchmarkDataById[row.benchmarkId] = [];
            }
            benchmarkDataById[row.benchmarkId].push(row);
          });

          // Crear objetos de benchmark
          benchmarkIds.forEach((benchmarkId: string) => {
            const benchmarkData = benchmarkDataById[benchmarkId];
            if (benchmarkData && benchmarkData.length > 0) {
              portfoliosToCompare.push({
                id: benchmarkId,
                name: benchmarkData[0]?.benchmarkName || `Benchmark ${benchmarkId}`,
                type: 'benchmark',
                components: benchmarkData
                  .filter(
                    (line: BenchmarkDataRow) =>
                      line.instrumentSymbol && !line.instrumentSymbol.includes(' ')
                  )
                  .map((line: BenchmarkDataRow) => ({
                    symbol: line.instrumentSymbol,
                    weight: Number(line.weight),
                    name: line.instrumentName,
                  })),
              });
            }
          });
        } catch (error) {
          req.log.warn({ error, benchmarkIds }, 'Failed to fetch benchmark data');
        }
      }

      if (portfoliosToCompare.length === 0) {
        return res.status(404).json({
          error: 'No valid portfolios or benchmarks found',
        });
      }

      // Llamar al servicio Python para comparación profesional
      // AI_DECISION: Timeout dinámico basado en cantidad de items
      // Justificación: Evita timeouts en comparaciones grandes, previene esperas excesivas en pequeñas
      // Impacto: Mejor UX y uso de recursos
      const dynamicTimeout = getPortfolioCompareTimeout(portfolioIds.length, benchmarkIds.length);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), dynamicTimeout);

      try {
        const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/portfolio/compare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portfolios: portfoliosToCompare.map((p) => ({
              id: p.id,
              name: p.name,
              components: p.components,
            })),
            period: period as string,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!pythonResponse.ok) {
          throw new Error(`Python service error: ${pythonResponse.statusText}`);
        }

        const pythonData = (await pythonResponse.json()) as {
          status: string;
          data?: {
            portfolios?: Record<
              string,
              {
                performance_series?: Array<{ date: string; value: number }>;
                total_return: number;
                annualized_return: number;
                volatility: number;
                sharpe_ratio: number;
                max_drawdown: number;
              }
            >;
          };
        };

        if (pythonData.status === 'success' && pythonData.data && pythonData.data.portfolios) {
          // Formatear respuesta compatible con frontend (normalizada a base 100)
          const results = Object.entries(pythonData.data.portfolios).map(
            ([portfolioId, perfData]: [
              string,
              {
                performance_series?: Array<{ date: string; value: number }>;
                total_return: number;
                annualized_return: number;
                volatility: number;
                sharpe_ratio: number;
                max_drawdown: number;
              },
            ]) => {
              const portfolioInfo = portfoliosToCompare.find((p) => p.id === portfolioId);

              return {
                id: portfolioId,
                name: portfolioInfo?.name || `Portfolio ${portfolioId}`,
                type: portfolioInfo?.type || 'portfolio',
                performance: (perfData.performance_series || []).map(
                  (point: { date: string; value: number }) => ({
                    date: point.date,
                    value: point.value, // Ya viene normalizado a base 100 desde Python
                  })
                ),
                metrics: {
                  totalReturn: perfData.total_return,
                  annualizedReturn: perfData.annualized_return,
                  volatility: perfData.volatility,
                  sharpeRatio: perfData.sharpe_ratio,
                  maxDrawdown: perfData.max_drawdown,
                },
              };
            }
          );

          res.json({
            success: true,
            data: {
              period,
              results,
              count: results.length,
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          throw new Error('Invalid response from Python service');
        }
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          req.log.error(
            {
              portfolioIds,
              benchmarkIds,
              pythonServiceUrl: PYTHON_SERVICE_URL,
              timeout: getPortfolioCompareTimeout(portfolioIds.length, benchmarkIds.length),
              hint: 'Analytics service may be slow or unavailable. Check service status or increase timeout.',
            },
            'Timeout calling Python service for portfolio comparison'
          );
          return res.status(504).json({
            error: 'Service timeout',
            details: 'Portfolio comparison calculation timed out',
          });
        }

        // Detectar errores de conexión específicos
        const errorObj = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        const isConnectionError =
          (errorObj as { code?: string }).code === 'ECONNREFUSED' ||
          (errorObj as { code?: string }).code === 'ETIMEDOUT' ||
          (errorObj.message &&
            (errorObj.message.includes('ECONNREFUSED') ||
              errorObj.message.includes('ETIMEDOUT') ||
              errorObj.message.includes('timeout') ||
              errorObj.message.includes('fetch failed')));

        const errorType = isConnectionError
          ? (errorObj as { code?: string }).code === 'ECONNREFUSED'
            ? 'connection refused (service not running)'
            : 'timeout or connection error'
          : 'unknown error';

        // Fallback: retornar error pero no crashear
        req.log.warn(
          {
            error: errorObj,
            errorType,
            pythonServiceUrl: PYTHON_SERVICE_URL,
            hint: isConnectionError
              ? 'Analytics service may not be running. Start it with: pnpm -F @maatwork/analytics-service dev'
              : 'Check analytics service logs for details',
          },
          `Python analytics service unavailable (${errorType}), returning empty comparison`
        );

        return res.json({
          success: true,
          data: {
            period,
            results: [],
            count: 0,
            message: 'Service unavailable or no data available',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      req.log.error(error, 'Error comparing portfolios/benchmarks');
      res.status(500).json({
        error: 'Failed to compare portfolios/benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
