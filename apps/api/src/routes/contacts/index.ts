/**
 * Contacts Routes - Module Index
 * 
 * Combines all contact-related routes into a single router.
 * 
 * Routes:
 * - GET /contacts - List contacts with filters (list.ts)
 * - GET /contacts/batch - Get multiple contacts (batch.ts)
 * - GET /contacts/:id - Get contact detail (get.ts)
 * - GET /contacts/:id/detail - Get consolidated contact detail (get.ts)
 * - POST /contacts - Create contact (create.ts)
 * - PUT /contacts/:id - Full update contact (update.ts)
 * - PATCH /contacts/:id - Partial update contact (update.ts)
 * - DELETE /contacts/:id - Soft delete contact (delete.ts)
 */
import { Router } from 'express';
import listRouter from './list';
import getRouter from './get';
import createRouter from './create';
import updateRouter from './update';
import deleteRouter from './delete';
import batchRouter from './batch';

const router = Router();

// Mount routes in order of specificity
// IMPORTANT: /batch must come before /:id to avoid matching 'batch' as an id
router.use(batchRouter);    // GET /contacts/batch
router.use(listRouter);     // GET /contacts
router.use(getRouter);      // GET /contacts/:id, GET /contacts/:id/detail
router.use(createRouter);   // POST /contacts
router.use(updateRouter);   // PUT /contacts/:id, PATCH /contacts/:id
router.use(deleteRouter);   // DELETE /contacts/:id

export default router;

// Re-export schemas for external use
export {
  listContactsQuerySchema,
  contactDetailQuerySchema,
  batchContactsQuerySchema,
  createContactSchema,
  updateContactSchema,
  patchContactSchema,
  type CreateContactInput,
  type UpdateContactInput,
  type PatchContactInput
} from './schemas';
