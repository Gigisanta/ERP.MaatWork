/**
 * Admin Database Maintenance Routes
 * 
 * Provides endpoints to run database maintenance tasks manually
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares';
import { runDailyMaintenance, runWeeklyMaintenance, getMaintenanceStats } from '../jobs/maintenance';
import { createErrorResponse } from '../utils/error-response';

const router = Router();

/**
 * GET /admin/maintenance/stats
 * Get database maintenance statistics
 */
router.get('/stats',
  requireAuth,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const stats = await getMaintenanceStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error fetching maintenance stats');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error obteniendo estadísticas de mantenimiento'
        })
      );
    }
  }
);

/**
 * POST /admin/maintenance/daily
 * Run daily maintenance (VACUUM ANALYZE)
 */
router.post('/daily',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      req.log.info('Manual daily maintenance triggered');
      await runDailyMaintenance();
      
      res.json({
        success: true,
        message: 'Daily maintenance completed successfully'
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error running daily maintenance');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error ejecutando mantenimiento diario'
        })
      );
    }
  }
);

/**
 * POST /admin/maintenance/weekly
 * Run weekly maintenance (REINDEX)
 */
router.post('/weekly',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      req.log.info('Manual weekly maintenance triggered');
      await runWeeklyMaintenance();
      
      res.json({
        success: true,
        message: 'Weekly maintenance completed successfully'
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error running weekly maintenance');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error ejecutando mantenimiento semanal'
        })
      );
    }
  }
);

export default router;

