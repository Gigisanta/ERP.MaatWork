/**
 * AUM Router Index
 * 
 * AI_DECISION: Consolidar todos los módulos AUM en un solo router
 * Justificación: Modularización completa de rutas AUM en archivos separados
 * Impacto: Código más organizado, mantenible y testeable
 */

import { Router } from 'express';
import uploadRouter from './upload';
import rowsRouter from './rows';
import commitRouter from './commit';
import adminRouter from './admin';

const router = Router();

// Mount sub-routers
router.use(uploadRouter);
router.use(rowsRouter);
router.use(commitRouter);
router.use(adminRouter);

export default router;

