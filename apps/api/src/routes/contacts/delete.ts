/**
 * Contacts Delete Route
 *
 * DELETE /contacts/:id - Soft delete contact
 */
import { Router, type Request } from 'express';
import { db, contacts } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { invalidateCache } from '../../middleware/cache';
import { createRouteHandler, HttpError } from '../../utils/route-handler';

const router = Router();

/**
 * DELETE /contacts/:id - Soft delete contact
 * Only managers and admins can delete contacts
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['manager', 'admin']),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;

    const [deleted] = await db()
      .update(contacts)
      .set({ deletedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    if (!deleted) {
      throw new HttpError(404, 'Contact not found');
    }

    // Invalidate Redis cache for contacts and pipeline
    await invalidateCache('crm:contacts:*');
    await invalidateCache('crm:pipeline:*');

    req.log.info({ contactId: id }, 'contact deleted');
    return { id, deleted: true };
  })
);

export default router;
