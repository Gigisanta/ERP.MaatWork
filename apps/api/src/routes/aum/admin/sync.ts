/**
 * AUM Contact Synchronization Routes
 */

import { Router, type Request, type Response } from 'express';
import { db, aumImportRows } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '@/auth/middlewares';
import { validate } from '@/utils/validation';
import { createAsyncHandler, HttpError } from '@/utils/route-handler';
import { syncContactAdvisorsFromAumRows } from '@/services/aum/contact-sync';
import { z } from 'zod';

const router = Router();

const syncContactsSchema = z.object({
  fileId: z.string().uuid(),
});

/**
 * POST /admin/aum/sync-contacts
 * Manually trigger synchronization of advisors from AUM rows to contacts
 */
router.post(
  '/sync-contacts',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ body: syncContactsSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.body;
    const dbi = db();

    // Fetch rows for the file
    const rows = await dbi.select().from(aumImportRows).where(eq(aumImportRows.fileId, fileId));

    if (rows.length === 0) {
      throw new HttpError(404, 'No AUM rows found for this file');
    }

    // Perform synchronization
    const result = await syncContactAdvisorsFromAumRows(dbi, rows, req.log);

    req.log?.info({ fileId, result }, 'Manual contact advisor synchronization completed');

    return res.json({
      success: true,
      data: result,
      message: `Sincronización completada: ${result.syncedCount} contactos actualizados, ${result.skippedCount} omitidos.`,
    });
  })
);

export default router;
