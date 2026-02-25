/**
 * Automations Routes - Module Index
 *
 * Combines all automation-related routes into a single router.
 *
 * Routes:
 * - GET /automations - List automation configs (crud.ts)
 * - GET /automations/by-name/:name - Get automation config by name (crud.ts)
 * - GET /automations/:id - Get automation config by ID (crud.ts)
 * - POST /automations - Create automation config (crud.ts)
 * - PATCH /automations/:id - Update automation config (crud.ts)
 * - DELETE /automations/:id - Delete automation config (crud.ts)
 */
import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import {
  idParamSchema,
  automationNameParamSchema,
  createAutomationConfigSchema,
  updateAutomationConfigSchema,
} from './schemas';

// Import handlers
import {
  handleListAutomations,
  handleGetAutomation,
  handleGetAutomationByName,
  handleCreateAutomation,
  handleUpdateAutomation,
  handleDeleteAutomation,
  handleAutomationsHealth,
} from './handlers/crud';

const router = Router();

// ==========================================================
// Health/Diagnostic Route
// ==========================================================

router.get('/health', requireAuth, handleAutomationsHealth);

// ==========================================================
// List Routes
// ==========================================================

router.get('/', requireAuth, handleListAutomations);


// ==========================================================
// Get by Name Route (must come before /:id routes)
// ==========================================================

router.get(
  '/by-name/:name',
  requireAuth,
  validate({ params: automationNameParamSchema }),
  handleGetAutomationByName
);

// ==========================================================
// CRUD Routes
// ==========================================================

router.get('/:id', requireAuth, validate({ params: idParamSchema }), handleGetAutomation);

router.post(
  '/',
  requireAuth,
  validate({ body: createAutomationConfigSchema }),
  handleCreateAutomation
);

router.patch(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateAutomationConfigSchema }),
  handleUpdateAutomation
);

router.delete('/:id', requireAuth, validate({ params: idParamSchema }), handleDeleteAutomation);

export default router;
