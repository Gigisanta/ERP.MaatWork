/**
 * AUM Admin - File Management Routes
 * 
 * Handles file upload deletion and verification
 */

import { Router, type Request, type Response } from 'express';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { db, aumImportFiles, aumImportRows } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { createErrorResponse } from '../../../utils/error-response';
import { HttpError } from '../../../utils/route-handler';
import { aumFileIdParamsSchema, aumPurgeQuerySchema } from '../../../utils/aum-validation';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

/**
 * DELETE /admin/aum/uploads/:fileId
 * Delete a specific import file
 */
router.delete('/uploads/:fileId',
  requireAuth,
  requireRole(['admin']),
  validate({ params: aumFileIdParamsSchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id as string;
      const userRole = req.user?.role as string;

      if (!userId || !userRole) {
        throw new HttpError(401, 'Unauthorized');
      }

      const dbi = db();

      // Verify file exists
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) {
        throw new HttpError(404, 'File not found');
      }

      // Prevent deletion of committed files (safety measure)
      if (file.status === 'committed') {
        throw new HttpError(400, 'Cannot delete committed import. Contact administrator if removal is necessary.');
      }

      // Delete associated rows first (CASCADE should handle this, but being explicit)
      await dbi.delete(aumImportRows).where(eq(aumImportRows.fileId, fileId));

      // Delete the file record
      await dbi.delete(aumImportFiles).where(eq(aumImportFiles.id, fileId));

      // Optionally delete physical file if it exists
      try {
        const filePath = join(uploadDir, file.originalFilename);
        await fs.unlink(filePath).catch(() => {
          // Ignore if file doesn't exist
        });
      } catch {}

      req.log?.info?.({ fileId, userId }, 'AUM file deleted');
      return res.json({ ok: true, message: 'Archivo eliminado exitosamente' });
    } catch (error) {
      req.log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM file deletion failed');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error eliminando archivo AUM'
        })
      );
    }
  }
);

/**
 * DELETE /admin/aum/uploads
 * Purge all non-committed uploads (or all if force=true)
 */
router.delete('/uploads',
  requireAuth,
  requireRole(['admin']),
  validate({ query: aumPurgeQuerySchema.optional() }),
  async (req: Request, res: Response) => {
    try {
      const dbi = db();
      const force = (req.query?.force as unknown as boolean) === true;

      if (force) {
        // Delete all rows and files
        await dbi.execute(sql`DELETE FROM aum_import_rows`);
        await dbi.execute(sql`DELETE FROM aum_import_files`);
        req.log?.info?.({ force }, 'AUM uploads purged (including committed)');
        return res.json({ ok: true, message: 'AUM uploads purgados (incluye committed)' });
      }

      // Only delete non-committed uploads
      await dbi.execute(sql`
        DELETE FROM aum_import_rows r
        USING aum_import_files f
        WHERE r.file_id = f.id AND f.status <> 'committed'
      `);
      await dbi.execute(sql`DELETE FROM aum_import_files WHERE status <> 'committed'`);

      req.log?.info?.({ force }, 'AUM uploads purged (non-committed only)');
      return res.json({ ok: true, message: 'AUM uploads purgados (solo no committed)' });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM purge failed');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error purgando archivos AUM'
        })
      );
    }
  }
);

/**
 * GET /admin/aum/verify/:fileId
 * Verify import integrity
 */
router.get('/verify/:fileId',
  requireAuth,
  validate({ params: aumFileIdParamsSchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id as string;
      const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

      if (!userId || !userRole) {
        throw new HttpError(401, 'Unauthorized');
      }

      const dbi = db();

      // Get file
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) {
        throw new HttpError(404, 'File not found');
      }

      // Count rows in DB
      const countResult = await dbi.execute(sql`
        SELECT COUNT(*)::int as count
        FROM aum_import_rows
        WHERE file_id = ${fileId}
      `);
      const dbCount = countResult.rows[0]?.count ?? 0;

      // Count rows with only holderName
      const onlyHolderNameResult = await dbi.execute(sql`
        SELECT COUNT(*)::int as count
        FROM aum_import_rows
        WHERE file_id = ${fileId}
          AND (account_number IS NULL OR account_number = '')
          AND (id_cuenta IS NULL OR id_cuenta = '')
          AND holder_name IS NOT NULL
          AND holder_name != ''
      `);
      const dbOnlyHolderNameCount = onlyHolderNameResult.rows[0]?.count ?? 0;

      // Count by match_status
      const statusResult = await dbi.execute(sql`
        SELECT 
          match_status,
          COUNT(*)::int as count
        FROM aum_import_rows
        WHERE file_id = ${fileId}
        GROUP BY match_status
      `);
      const statusCounts = (statusResult.rows || []).reduce((acc: Record<string, number>, row: unknown) => {
        const r = row as { match_status: string; count: number };
        acc[r.match_status] = r.count;
        return acc;
      }, {} as Record<string, number>);

      // Check for discrepancies
      const discrepancy = file.totalParsed - dbCount;
      const hasDiscrepancy = discrepancy !== 0;

      req.log?.info?.({
        fileId,
        dbCount,
        fileTotalParsed: file.totalParsed,
        discrepancy
      }, 'AUM file verification completed');

      return res.json({
        ok: true,
        file: {
          id: file.id,
          broker: file.broker,
          originalFilename: file.originalFilename,
          status: file.status,
          totals: {
            parsed: file.totalParsed,
            matched: file.totalMatched,
            unmatched: file.totalUnmatched
          },
          createdAt: file.createdAt
        },
        verification: {
          dbCount,
          fileTotalParsed: file.totalParsed,
          discrepancy,
          hasDiscrepancy,
          onlyHolderNameCount: dbOnlyHolderNameCount,
          statusCounts
        }
      });
    } catch (error) {
      req.log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM verify failed');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: req.requestId,
          userMessage: 'Error verificando archivo AUM'
        })
      );
    }
  }
);

export default router;

