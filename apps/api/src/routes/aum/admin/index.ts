/**
 * AUM Admin Routes - Main Entry Point
 *
 * Combines all admin route modules
 */

import { Router } from 'express';
import filesRouter from './files';
import purgeRouter from './purge';
import mappingRouter from './mapping';
import syncRouter from './sync';

const router = Router();

// Mount sub-routers
router.use(filesRouter);
router.use(purgeRouter);
router.use(mappingRouter);
router.use(syncRouter);

export default router;
