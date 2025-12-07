/**
 * Notes Routes - Module Index
 *
 * Combines all note-related routes into a single router.
 *
 * Routes:
 * - GET /notes - List notes for a contact (list.ts)
 * - GET /notes/batch - Get notes for multiple contacts (list.ts)
 * - GET /notes/:id - Get note by ID (crud.ts)
 * - POST /notes - Create note (crud.ts)
 * - PUT /notes/:id - Update note (crud.ts)
 * - DELETE /notes/:id - Delete note (crud.ts)
 */
import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import {
  listNotesQuerySchema,
  batchNotesQuerySchema,
  idParamSchema,
  createNoteSchema,
  updateNoteSchema,
} from './schemas';

// Import handlers
import { handleListNotes, handleBatchNotes } from './handlers/list';
import {
  handleGetNote,
  handleCreateNote,
  handleUpdateNote,
  handleDeleteNote,
} from './handlers/crud';

const router = Router();

// ==========================================================
// List Routes (must come before /:id routes)
// ==========================================================

router.get(
  '/',
  requireAuth,
  validate({ query: listNotesQuerySchema }),
  handleListNotes
);

router.get(
  '/batch',
  requireAuth,
  validate({ query: batchNotesQuerySchema }),
  handleBatchNotes
);

// ==========================================================
// CRUD Routes
// ==========================================================

router.get('/:id', requireAuth, validate({ params: idParamSchema }), handleGetNote);

router.post('/', requireAuth, validate({ body: createNoteSchema }), handleCreateNote);

router.put(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateNoteSchema }),
  handleUpdateNote
);

router.delete('/:id', requireAuth, validate({ params: idParamSchema }), handleDeleteNote);

export default router;

// Re-export schemas for external use
export {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  batchNotesQuerySchema,
  idParamSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './schemas';






















