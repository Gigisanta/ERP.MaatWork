/**
 * AUM Admin - Purge Operations Routes
 * 
 * Handles destructive purge and cleanup operations
 */

import { Router, type Request } from 'express';
import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '@/auth/middlewares';
import { validate } from '@/utils/validation';
import { createRouteHandler } from '@/utils/route-handler';
import { aumPurgeAllQuerySchema } from '@/utils/aum-validation';

const router = Router();

/**
 * DELETE /admin/aum/purge-all
 * Destructive: purge all AUM and broker data
 */
router.delete('/purge-all',
  requireAuth,
  requireRole(['admin']),
  validate({ query: aumPurgeAllQuerySchema.optional() }),
  createRouteHandler(async (req: Request) => {
    const dbi = db();
    const broker = req.query?.broker as string | undefined;

    if (broker) {
      await dbi.execute(sql`DELETE FROM broker_accounts WHERE broker = ${broker}`);
    } else {
      await dbi.execute(sql`DELETE FROM broker_accounts`);
    }

    await dbi.execute(sql`DELETE FROM aum_import_rows`);
    await dbi.execute(sql`DELETE FROM aum_import_files`);

    req.log?.info?.({ broker, userId: req.user?.id }, 'AUM/broker system purged completely');

    return { ok: true, message: 'Sistema AUM/broker purgado completamente' };
  })
);

/**
 * POST /admin/aum/cleanup-duplicates
 * Clean up duplicate rows, keeping only the most recent per broker+accountNumber
 */
router.post('/cleanup-duplicates',
  requireAuth,
  requireRole(['admin', 'manager']),
  createRouteHandler(async (req: Request) => {
    const dbi = db();

    // Clean duplicates using accountNumber OR holderName+advisorRaw
    const result = await dbi.execute(sql`
      WITH ranked_rows AS (
        SELECT 
          r.id,
          ROW_NUMBER() OVER (
            PARTITION BY 
              f.broker, 
              COALESCE(
                r.account_number, 
                CASE 
                  WHEN r.holder_name IS NOT NULL AND r.advisor_raw IS NOT NULL 
                  THEN r.holder_name || '|' || r.advisor_raw 
                  ELSE NULL 
                END
              )
            ORDER BY f.created_at DESC, r.created_at DESC
          ) as rn
        FROM aum_import_rows r
        INNER JOIN aum_import_files f ON r.file_id = f.id
        WHERE r.account_number IS NOT NULL 
           OR (r.holder_name IS NOT NULL AND r.advisor_raw IS NOT NULL)
      )
      DELETE FROM aum_import_rows
      WHERE id IN (
        SELECT id FROM ranked_rows WHERE rn > 1
      )
    `);

    const deletedCount = result.rowCount || 0;

    req.log?.info?.({ deletedCount }, 'AUM duplicates cleaned up');

    return {
      ok: true,
      message: `Se eliminaron ${deletedCount} filas duplicadas`,
      deletedCount,
    };
  })
);

/**
 * POST /admin/aum/reset-all
 * Destructive: reset entire AUM system
 */
router.post('/reset-all',
  requireAuth,
  requireRole(['admin', 'manager']),
  createRouteHandler(async (req: Request) => {
    const dbi = db();

    // Delete ALL AUM rows (including committed)
    await dbi.execute(sql`DELETE FROM aum_import_rows`);

    // Delete ALL AUM files (including committed)
    await dbi.execute(sql`DELETE FROM aum_import_files`);

    req.log?.info?.({ userId: req.user?.id }, 'AUM system reset - all data deleted');

    return {
      ok: true,
      message: 'Sistema AUM limpiado completamente. Listo para cargar el primer archivo.',
    };
  })
);

export default router;

