/**
 * Admin Query Metrics Routes
 * 
 * Endpoints para exponer métricas de queries y análisis de performance
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares';
import { getQueryMetrics, getSlowQueries, getNPlusOneQueries } from '../utils/db-logger';
import { analyzeQueries, generateTextReport, type QueryAnalysisReport } from '../utils/query-analyzer';
import { getCacheHealth } from '../utils/cache';
import { createErrorResponse } from '../utils/error-response';

const router = Router();

// ==========================================================
// GET /admin/query-metrics - Obtener métricas de queries
// ==========================================================
router.get('/query-metrics',
  requireAuth,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const threshold = req.query.threshold ? Number(req.query.threshold) : 500;
      
      const allMetrics = getQueryMetrics();
      const slowQueries = getSlowQueries(threshold);
      const nPlusOneQueries = getNPlusOneQueries();
      const cacheHealth = getCacheHealth();

      res.json({
        success: true,
        data: {
          allMetrics: allMetrics.slice(0, 100), // Top 100 queries
          slowQueries,
          nPlusOneQueries,
          cacheHealth,
          summary: {
            totalQueries: allMetrics.length,
            slowQueriesCount: slowQueries.length,
            nPlusOneQueriesCount: nPlusOneQueries.length,
            threshold
          }
        }
      });
    } catch (error) {
      req.log.error({ error }, 'Error fetching query metrics');
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

// ==========================================================
// GET /admin/query-analysis - Análisis completo de queries con recomendaciones
// ==========================================================
router.get('/query-analysis',
  requireAuth,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const threshold = req.query.threshold ? Number(req.query.threshold) : 500;
      const format = req.query.format as string | undefined;
      
      const report = analyzeQueries(threshold);

      if (format === 'text') {
        const textReport = generateTextReport(report);
        res.setHeader('Content-Type', 'text/plain');
        res.send(textReport);
      } else {
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      req.log.error({ error }, 'Error generating query analysis');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error generando análisis de queries'
        })
      );
    }
  }
);

export default router;

