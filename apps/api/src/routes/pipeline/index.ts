/**
 * Pipeline Routes - Main Entry Point
 *
 * Combines all pipeline route modules
 */

import { Router } from 'express';
import stagesRouter from './stages';
import boardRouter from './board';
import moveRouter from './move';
import metricsRouter from './metrics';

const router = Router();

// Mount sub-routers
router.use(stagesRouter);
router.use(boardRouter);
router.use(moveRouter);
router.use(metricsRouter);

export default router;
