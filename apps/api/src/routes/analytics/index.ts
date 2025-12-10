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

const router = Router();

// Mount sub-routers
router.use(dashboardRouter);
router.use(metricsRouter);
router.use(performanceRouter);
router.use(comparisonRouter);

export default router;
