/**
 * Analytics Routes - Main Entry Point
 *
 * Combines all analytics route modules
 */

import { Router } from 'express';
import dashboardRouter from './dashboard';
import metricsRouter from './metrics';
import performanceRouter from './performance';
import comparisonRouter from './comparison';
import { createAsyncHandler } from '../../utils/route-handler';

const router = Router();

// Mount sub-routers
router.use(dashboardRouter);
router.use(metricsRouter);
router.use(performanceRouter);
router.use(comparisonRouter);

// Debug route to verify analytics mounting
router.get(
  '/ping',
  createAsyncHandler(async (_req, res) => {
    return res.json({ status: 'ok', service: 'analytics' });
  })
);

export default router;
