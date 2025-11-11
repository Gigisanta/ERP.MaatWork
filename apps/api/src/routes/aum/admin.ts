/**
 * AUM Admin Routes
 * 
 * AI_DECISION: Modularizar endpoints de administración en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { db, aumImportFiles, aumImportRows, advisorAccountMapping, advisorAliases } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { AUM_LIMITS } from '../../config/aum-limits';
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../../utils/aum-normalization';
import { parseAumFile } from '../../services/aumParser';
import {
  aumFileIdParamsSchema,
  aumPurgeQuerySchema,
  aumPurgeAllQuerySchema
} from '../../utils/aum-validation';

const router = Router();

// ==========================================================
// File Upload Configuration (for advisor mapping)
// ==========================================================

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {}
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: AUM_LIMITS.MAX_FILE_SIZE
  }
});

// ==========================================================
// Routes
// ==========================================================

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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dbi = db();

      // Verify file exists
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Prevent deletion of committed files (safety measure)
      if (file.status === 'committed') {
        return res.status(400).json({
          error: 'Cannot delete committed import. Contact administrator if removal is necessary.'
        });
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
      } catch {
        // Ignore file system errors
      }

      req.log?.info?.({
        fileId,
        userId,
        filename: file.originalFilename,
        status: file.status
      }, 'AUM import file deleted');

      return res.json({ ok: true, message: 'File deleted successfully' });
    } catch (error) {
      req.log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM delete failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
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
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * DELETE /admin/aum/purge-all
 * Destructive: purge all AUM and broker data
 */
router.delete('/purge-all',
  requireAuth,
  requireRole(['admin']),
  validate({ query: aumPurgeAllQuerySchema.optional() }),
  async (req: Request, res: Response) => {
    try {
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

      return res.json({ ok: true, message: 'Sistema AUM/broker purgado completamente' });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM purge-all failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * POST /admin/aum/cleanup-duplicates
 * Clean up duplicate rows, keeping only the most recent per broker+accountNumber
 */
router.post('/cleanup-duplicates',
  requireAuth,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
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

      return res.json({
        ok: true,
        message: `Se eliminaron ${deletedCount} filas duplicadas`,
        deletedCount
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM cleanup-duplicates failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * POST /admin/aum/reset-all
 * Destructive: reset entire AUM system
 */
router.post('/reset-all',
  requireAuth,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const dbi = db();

      // Delete ALL AUM rows (including committed)
      await dbi.execute(sql`DELETE FROM aum_import_rows`);

      // Delete ALL AUM files (including committed)
      await dbi.execute(sql`DELETE FROM aum_import_files`);

      req.log?.info?.({ userId: req.user?.id }, 'AUM system reset - all data deleted');

      return res.json({
        ok: true,
        message: 'Sistema AUM limpiado completamente. Listo para cargar el primer archivo.'
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM reset-all failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * POST /admin/aum/advisor-mapping/upload
 * Upload advisor-account mapping file
 */
router.post('/advisor-mapping/upload',
  requireAuth,
  requireRole(['admin']),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        req.log?.error?.({ err, filename: (req as any).file?.originalname }, 'Error en multer upload');
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'Error al procesar el archivo',
              details: `Archivo demasiado grande. Tamaño máximo: ${AUM_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
          }
          return res.status(400).json({
            error: 'Error al procesar el archivo',
            details: `Error de upload: ${err.message}`
          });
        }
        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        req.log?.warn?.({ userId }, 'Upload request sin archivo');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      req.log?.info?.({
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        userId
      }, 'Iniciando procesamiento de mapeo asesor-cuenta');

      const dbi = db();

      // Parse file using service
      const parseResult = await parseAumFile(file.path, file.originalname);

      if (!parseResult.success || !parseResult.data) {
        // Cleanup temp file
        try {
          await fs.unlink(file.path);
        } catch {}

        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: parseResult.error || parseResult.details || 'Error desconocido'
        });
      }

      const parsedRows = parseResult.data;

      let inserted = 0;
      let updated = 0;
      let errors = 0;

      // Process each row
      for (const row of parsedRows) {
        if (!row.accountNumber) {
          errors++;
          continue;
        }

        const normalizedAccountNumber = normalizeAccountNumber(row.accountNumber);
        const advisorName = row.advisorRaw || null;
        const advisorRaw = advisorName ? normalizeAdvisorAlias(advisorName) : null;

        try {
          // Find existing mapping
          const existing = await dbi.select().from(advisorAccountMapping)
            .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber))
            .limit(1);

          // Try automatic match with advisorAliases if we have advisorRaw
          let matchedUserId: string | null = null;
          if (advisorRaw) {
            try {
              const advisorMatch = await dbi.select().from(advisorAliases)
                .where(eq(advisorAliases.aliasNormalized, advisorRaw))
                .limit(1);
              if (advisorMatch.length > 0) {
                matchedUserId = (advisorMatch[0] as any).userId as string;
              }
            } catch {}
          }

          if (existing.length > 0) {
            // Update existing mapping
            await dbi.update(advisorAccountMapping)
              .set({
                advisorName: advisorName,
                advisorRaw: advisorRaw,
                matchedUserId: matchedUserId,
                updatedAt: new Date()
              })
              .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber));
            updated++;
          } else {
            // Insert new mapping
            await dbi.insert(advisorAccountMapping).values({
              accountNumber: normalizedAccountNumber,
              advisorName: advisorName,
              advisorRaw: advisorRaw,
              matchedUserId: matchedUserId
            });
            inserted++;
          }
        } catch (error) {
          errors++;
          req.log?.error?.({
            err: error,
            accountNumber: normalizedAccountNumber,
            filename: file.originalname
          }, 'Error procesando fila de mapeo asesor');
        }
      }

      // Cleanup temp file
      try {
        await fs.unlink(file.path);
      } catch {}

      req.log?.info?.({
        inserted,
        updated,
        errors,
        total: parsedRows.length
      }, 'Advisor mapping uploaded successfully');

      return res.status(201).json({
        ok: true,
        message: 'Mapeo de asesores cargado exitosamente',
        totals: {
          inserted,
          updated,
          errors,
          total: parsedRows.length
        }
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM advisor mapping upload failed');
      return res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dbi = db();

      // Get file
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
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
      const statusCounts = (statusResult.rows || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.match_status] = row.count;
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
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

export default router;

