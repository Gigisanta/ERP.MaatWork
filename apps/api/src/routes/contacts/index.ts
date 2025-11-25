/**
 * Contacts Routes - Main Entry Point
 * 
 * Combines all contact route modules
 */

import { Router } from 'express';
import crudRouter from './crud';
import assignmentRouter from './assignment';
import historyRouter from './history';
import webhookRouter from './webhook';

const router = Router();

// Mount sub-routers
router.use(crudRouter);
router.use(assignmentRouter);
router.use(historyRouter);
router.use(webhookRouter);

export default router;

