/**
 * Contacts Routes - Module Index
 *
 * Combines all contact-related routes into a single router.
 *
 * Routes:
 * - GET /contacts/search - Fuzzy search with pg_trgm similarity (search.ts)
 * - GET /contacts - List contacts with filters (list.ts)
 * - GET /contacts/batch - Get multiple contacts (batch.ts)
 * - POST /contacts/webhook - Export contacts to webhook (webhook.ts)
 * - GET /contacts/:id - Get contact detail (get.ts)
 * - GET /contacts/:id/detail - Get consolidated contact detail (get.ts)
 * - GET /contacts/:id/history - Get contact change history (history.ts)
 * - POST /contacts - Create contact (create.ts)
 * - PATCH /contacts/:id/next-step - Update contact next step (assignment.ts)
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
import webhookRouter from './webhook';
import historyRouter from './history';
import assignmentRouter from './assignment';
import interactionRouter from './interactions';
import importRouter from './import-router';
import searchRouter from './search';

const router = Router();

// Mount routes in order of specificity
// IMPORTANT: Specific routes (/search, /batch, /webhook, /import) must come before parameterized routes (/:id)
router.use(searchRouter); // GET /contacts/search
router.use(batchRouter); // GET /contacts/batch
router.use(webhookRouter); // POST /contacts/webhook
router.use(importRouter); // POST /contacts/import
router.use(listRouter); // GET /contacts
router.use(historyRouter); // GET /contacts/:id/history (must come before getRouter)
router.use(interactionRouter); // POST /contacts/:id/interaction
router.use(assignmentRouter); // PATCH /contacts/:id/next-step (must come before updateRouter)
router.use(getRouter); // GET /contacts/:id, GET /contacts/:id/detail
router.use(createRouter); // POST /contacts
router.use(updateRouter); // PUT /contacts/:id, PATCH /contacts/:id
router.use(deleteRouter); // DELETE /contacts/:id

export default router;
