import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation/common-schemas';
import { createLevelSchema, updateLevelSchema } from './schemas';
import {
  handleListLevels,
  handleGetLevel,
  handleCreateLevel,
  handleUpdateLevel,
  handleDeleteLevel,
} from './handlers/levels';
import { handleGetUserProgress } from './handlers/progress';

const router = Router();

// ==========================================================
// Career Plan Levels (Admin)
// ==========================================================

router.get('/levels', requireAuth, handleListLevels);

router.get('/levels/:id', requireAuth, validate({ params: idParamSchema }), handleGetLevel);

router.post(
  '/levels',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createLevelSchema }),
  handleCreateLevel
);

router.put(
  '/levels/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateLevelSchema }),
  handleUpdateLevel
);

router.delete(
  '/levels/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema }),
  handleDeleteLevel
);

// ==========================================================
// User Progress
// ==========================================================

router.get('/user-progress', requireAuth, handleGetUserProgress);

export default router;
