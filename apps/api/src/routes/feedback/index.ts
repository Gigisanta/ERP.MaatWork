import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation/common-schemas';
import { createFeedbackSchema, updateFeedbackStatusSchema } from './schemas';
import { handleCreateFeedback, handleListFeedback, handleUpdateFeedbackStatus } from './handlers';

const router = Router();

// ==========================================================
// User Feedback Routes
// ==========================================================

/**
 * POST /v1/feedback
 * Submit new feedback (any authenticated user)
 */
router.post('/', requireAuth, validate({ body: createFeedbackSchema }), handleCreateFeedback);

/**
 * GET /v1/feedback
 * List all feedback (admin only)
 */
router.get('/', requireAuth, requireRole(['admin']), handleListFeedback);

/**
 * PATCH /v1/feedback/:id
 * Update feedback status (admin only)
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateFeedbackStatusSchema }),
  handleUpdateFeedbackStatus
);

export default router;
