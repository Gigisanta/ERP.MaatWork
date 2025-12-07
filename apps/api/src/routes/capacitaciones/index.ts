/**
 * Capacitaciones Routes - Module Index
 *
 * Combines all capacitaciones-related routes into a single router.
 *
 * Routes:
 * - GET /capacitaciones - List capacitaciones (list.ts)
 * - GET /capacitaciones/:id - Get capacitacion by ID (crud.ts)
 * - POST /capacitaciones - Create capacitacion (crud.ts)
 * - POST /capacitaciones/import - Import from CSV (import.ts)
 * - PUT /capacitaciones/:id - Update capacitacion (crud.ts)
 * - DELETE /capacitaciones/:id - Delete capacitacion (crud.ts)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import {
  listCapacitacionesQuerySchema,
  idParamSchema,
  createCapacitacionSchema,
  updateCapacitacionSchema,
} from './schemas';

// Import handlers
import { handleListCapacitaciones } from './handlers/list';
import {
  handleGetCapacitacion,
  handleCreateCapacitacion,
  handleUpdateCapacitacion,
  handleDeleteCapacitacion,
} from './handlers/crud';
import { handleImportCapacitaciones } from './handlers/import';

const router = Router();

// ==========================================================
// List Routes
// ==========================================================

router.get(
  '/',
  requireAuth,
  validate({ query: listCapacitacionesQuerySchema }),
  handleListCapacitaciones
);

// ==========================================================
// Import Route (must come before /:id routes)
// ==========================================================

router.post('/import', requireAuth, requireRole(['admin']), ...handleImportCapacitaciones);

// ==========================================================
// CRUD Routes
// ==========================================================

router.get('/:id', requireAuth, validate({ params: idParamSchema }), handleGetCapacitacion);

router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createCapacitacionSchema }),
  handleCreateCapacitacion
);

router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateCapacitacionSchema }),
  handleUpdateCapacitacion
);

router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema }),
  handleDeleteCapacitacion
);

export default router;

// Re-export schemas for external use
export {
  createCapacitacionSchema,
  updateCapacitacionSchema,
  listCapacitacionesQuerySchema,
  idParamSchema,
  type CreateCapacitacionInput,
  type UpdateCapacitacionInput,
} from './schemas';






















