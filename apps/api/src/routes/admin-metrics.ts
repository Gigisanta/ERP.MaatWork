/**
 * Admin Metrics Routes
 * 
 * Provides query performance metrics and N+1 detection dashboard
 */
import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares';
import { getQueryMetrics, getSlowQueries, getNPlusOneQueries } from '../utils/db-logger';
import { analyzeQuery } from '../utils/query-analysis';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { createErrorResponse } from '../utils/error-response';

const router = Router();

// Query parameter schema
const queryMetricsQuerySchema = z.object({
  slowThreshold: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * GET /admin/metrics/queries
 * Obtener métricas de queries para dashboard
 */
router.get('/queries',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ query: queryMetricsQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const slowThreshold = typeof req.query.slowThreshold === 'string' 
        ? parseInt(req.query.slowThreshold, 10) 
        : Array.isArray(req.query.slowThreshold)
        ? parseInt(String(req.query.slowThreshold[0]), 10)
        : (req.query.slowThreshold as number | undefined) || 500;
      const limit = typeof req.query.limit === 'string'
        ? parseInt(req.query.limit, 10)
        : Array.isArray(req.query.limit)
        ? parseInt(String(req.query.limit[0]), 10)
        : (req.query.limit as number | undefined) || 50;

      const allMetrics = getQueryMetrics();
      const slowQueries = getSlowQueries(slowThreshold);
      const nPlusOneQueries = getNPlusOneQueries();

      // Estadísticas generales
      const stats = {
        totalOperations: allMetrics.length,
        slowQueriesCount: slowQueries.length,
        nPlusOneQueriesCount: nPlusOneQueries.length,
        avgQueryDuration: allMetrics.length > 0
          ? allMetrics.reduce((sum, m) => sum + m.avgDuration, 0) / allMetrics.length
          : 0
      };

      res.json({
        success: true,
        data: {
          stats,
          slowQueries: slowQueries.slice(0, limit),
          nPlusOneQueries: nPlusOneQueries.slice(0, limit),
          allMetrics: allMetrics.slice(0, limit)
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error fetching query metrics');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error obteniendo métricas de queries'
        })
      );
    }
  }
);

// Body schema for query analysis
const analyzeQuerySchema = z.object({
  query: z.string().min(1),
  params: z.array(z.unknown()).optional()
});

/**
 * POST /admin/metrics/queries/analyze
 * Analizar una query SQL específica con EXPLAIN ANALYZE
 */
router.post('/queries/analyze',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ body: analyzeQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { query, params = [] } = req.body;

      const analysis = await analyzeQuery(req.log, query, params);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error analyzing query');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error analizando query'
        })
      );
    }
  }
);

export default router;

