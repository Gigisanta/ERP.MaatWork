/**
 * Metrics Routes - Main Entry Point
 * 
 * Combines all metrics route modules
 */

import { Router } from 'express';
import contactsRouter from './contacts';
import goalsRouter from './goals';

const router = Router();

// Mount sub-routers
router.use(contactsRouter);
router.use(goalsRouter);

export default router;

