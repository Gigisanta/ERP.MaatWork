/**
 * Analytics Performance Routes
 * 
 * Handles portfolio performance calculations
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { 
  portfolioTemplates,
  portfolioTemplateLines,
  instruments
} from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { TIMEOUTS } from '../../config/timeouts';

const router = Router();

// URL del microservicio Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /analytics/performance/:portfolioId - Obtener rendimiento de una cartera
 * AI_DECISION: Usar servicio Python para cálculos profesionales de rendimiento
 * Justificación: Aprovecha código existente en portfolio_performance.py con pandas/numpy
 * Impacto: Cálculos más precisos, eliminación de código duplicado
 */
router.get('/performance/:portfolioId', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { portfolioId } = req.params;
    const { period = '1Y' } = req.query;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validar período
    const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period. Valid periods: 1M, 3M, 6M, 1Y, YTD, ALL'
      });
    }

    // Obtener composición de la cartera y nombre
    const portfolioData = await db()
      .select({
        portfolioName: portfolioTemplates.name,
        instrumentId: portfolioTemplateLines.instrumentId,
        weight: portfolioTemplateLines.targetWeight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name
      })
      .from(portfolioTemplates)
      .innerJoin(portfolioTemplateLines, eq(portfolioTemplateLines.templateId, portfolioTemplates.id))
      .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
      .where(eq(portfolioTemplates.id, portfolioId))
      .limit(100); // Límite razonable de componentes

    if (portfolioData.length === 0) {
      return res.status(404).json({
        error: 'Portfolio not found or has no components'
      });
    }

    const portfolioName = portfolioData[0]?.portfolioName || `Portfolio ${portfolioId}`;

    // Preparar componentes para Python service
    const components = portfolioData.map((line: { instrumentSymbol: string; weight: string | number; instrumentName: string }) => ({
      symbol: line.instrumentSymbol,
      weight: Number(line.weight),
      name: line.instrumentName
    }));

    // Llamar al servicio Python para cálculo profesional
    // AI_DECISION: Timeout configurable vía env var
    // Justificación: Permite ajustar según carga/entorno sin redeploy
    // Impacto: Mejor configurabilidad y mantenibilidad
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.PORTFOLIO_PERFORMANCE);

    try {
      const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/portfolio/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          portfolio_name: portfolioName,
          components,
          period: period as string
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!pythonResponse.ok) {
        throw new Error(`Python service error: ${pythonResponse.statusText}`);
      }

      const pythonData = await pythonResponse.json() as {
        status: string;
        data?: {
          portfolio_name: string;
          period: string;
          performance_series?: Array<{ date: string; value: number }>;
          total_return: number;
          annualized_return: number;
          volatility: number;
          sharpe_ratio: number;
          max_drawdown: number;
        };
      };

      if (pythonData.status === 'success' && pythonData.data) {
        // Formatear respuesta compatible con frontend
        res.json({
          success: true,
          data: {
            portfolioId,
            portfolioName: pythonData.data.portfolio_name,
            period: pythonData.data.period,
            performance: pythonData.data.performance_series || [],
            metrics: {
              totalReturn: pythonData.data.total_return,
              annualizedReturn: pythonData.data.annualized_return,
              volatility: pythonData.data.volatility,
              sharpeRatio: pythonData.data.sharpe_ratio,
              maxDrawdown: pythonData.data.max_drawdown
            },
            components: components.map((c: { symbol: string; weight: number; name: string }) => ({
              symbol: c.symbol,
              name: c.name,
              weight: c.weight
            }))
          },
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Invalid response from Python service');
      }

    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        req.log.error({ 
          portfolioId,
          pythonServiceUrl: PYTHON_SERVICE_URL,
          timeout: TIMEOUTS.PORTFOLIO_PERFORMANCE,
          hint: 'Analytics service may be slow or unavailable. Check service status or increase timeout.'
        }, 'Timeout calling Python service for portfolio performance');
        return res.status(504).json({
          error: 'Service timeout',
          details: 'Portfolio performance calculation timed out'
        });
      }

      // Detectar errores de conexión específicos
      const errorObj = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      const isConnectionError = 
        (errorObj as { code?: string }).code === 'ECONNREFUSED' ||
        (errorObj as { code?: string }).code === 'ETIMEDOUT' ||
        (errorObj.message && (
          errorObj.message.includes('ECONNREFUSED') ||
          errorObj.message.includes('ETIMEDOUT') ||
          errorObj.message.includes('timeout') ||
          errorObj.message.includes('fetch failed')
        ));

      const errorType = isConnectionError
        ? ((errorObj as { code?: string }).code === 'ECONNREFUSED' 
          ? 'connection refused (service not running)' 
          : 'timeout or connection error')
        : 'unknown error';

      // Fallback: retornar error pero no crashear
      req.log.warn({ 
        error: errorObj, 
        portfolioId,
        errorType,
        pythonServiceUrl: PYTHON_SERVICE_URL,
        hint: isConnectionError 
          ? 'Analytics service may not be running. Start it with: pnpm -F @cactus/analytics-service dev'
          : 'Check analytics service logs for details'
      }, `Python analytics service unavailable (${errorType}), returning empty performance`);
      
      return res.json({
        success: true,
        data: {
          portfolioId,
          period,
          message: 'No price data available or service unavailable',
          performance: []
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    req.log.error(error, 'Error fetching portfolio performance');
    res.status(500).json({
      error: 'Failed to fetch portfolio performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

