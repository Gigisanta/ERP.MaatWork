/**
 * Contacts Delete Route
 *
 * DELETE /contacts/:id - Soft delete contact
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { invalidateCache } from '../../middleware/cache';
import { HttpError } from '../../utils/route-handler';

const router = Router();

/**
 * DELETE /contacts/:id - Soft delete contact
 * Only managers and admins can delete contacts
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['manager', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err) {
      req.log.error({ err, contactId: req.params.id }, 'failed to delete contact');
      next(err);
    }
  }
);

export default router;





