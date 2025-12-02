/**
 * AUM Router Index
 *
 * AI_DECISION: Consolidar todos los módulos AUM en un solo router
 * Justificación: Modularización completa de rutas AUM en archivos separados
 * Impacto: Código más organizado, mantenible y testeable
 */

import { Router } from 'express';
import uploadRouter from './upload/index';
import rowsRouter from './rows/index';
import commitRouter from './commit';
import adminRouter from './admin';

const router = Router();

// Mount sub-routers with correct prefixes
// AI_DECISION: Configurar prefijos para coincidir exactamente con las URLs del frontend
// Justificación: El frontend llama a /v1/admin/aum/rows/all, /v1/admin/aum/uploads, etc.
// Impacto: Rutas correctamente expuestas y coherentes con el frontend
router.use('/rows', rowsRouter); // GET /admin/aum/rows/all, /admin/aum/rows/duplicates/:accountNumber, PATCH /admin/aum/rows/:rowId
router.use(uploadRouter); // POST /admin/aum/uploads, GET /admin/aum/uploads/:fileId/preview
router.use(commitRouter); // POST /admin/aum/uploads/:fileId/commit
router.use(adminRouter); // Cleanup, reset, mapping, file deletion (sin prefijo adicional)

export default router;
