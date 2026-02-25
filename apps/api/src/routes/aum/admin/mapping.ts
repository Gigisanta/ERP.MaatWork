/**
 * AUM Admin - Advisor Mapping Routes
 *
 * Handles advisor-account mapping file uploads
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'node:fs';
import { db, advisorAccountMapping, advisorAliases } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { AUM_LIMITS } from '../../../config/aum-limits';
import {
  normalizeAccountNumber,
  normalizeAdvisorAlias,
} from '../../../utils/aum/aum-normalization';
import { parseAumFile } from '../../../services/aum-parser';
import {
  createAumUpload,
  handleMulterError,
  DEFAULT_UPLOAD_DIR,
} from '../../../utils/file/file-upload';

const router = Router();

// File Upload Configuration (using centralized utility)
const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
// Lazily create upload to honor per-test multer mocks and avoid stale instances
const getUpload = () => createAumUpload(AUM_LIMITS.MAX_FILE_SIZE, uploadDir);

/**
 * POST /admin/aum/advisor-mapping/upload
 * Upload advisor-account mapping file
 */
router.post(
  '/advisor-mapping/upload',
  requireAuth,
  requireRole(['admin']),
  (req, res, next) => {
    const upload = getUpload();
    upload.single('file')(req, res, (err) => {
      if (err) {
        req.log?.error?.(
          { err, filename: (req as { file?: Express.Multer.File }).file?.originalname },
          'Error en multer upload'
        );
        return handleMulterError(err, res, { maxFileSize: AUM_LIMITS.MAX_FILE_SIZE });
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

      const file = (req as { file?: Express.Multer.File }).file;
      if (!file) {
        req.log?.warn?.({ userId }, 'Upload request sin archivo');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      req.log?.info?.(
        {
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          userId,
        },
        'Iniciando procesamiento de mapeo asesor-cuenta'
      );

      const dbi = db();

      // Parse file using service
      const parseResult = await parseAumFile(file.path, file.originalname);

      if (!parseResult.success || !parseResult.data) {
        // Cleanup temp file
        try {
          await fs.unlink(file.path);
        } catch {
          // Ignore cleanup error
        }

        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: parseResult.error || parseResult.details || 'Error desconocido',
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
          const existing = await dbi
            .select()
            .from(advisorAccountMapping)
            .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber))
            .limit(1);

          // Try automatic match with advisorAliases if we have advisorRaw
          let matchedUserId: string | null = null;
          if (advisorRaw) {
            try {
              const advisorMatch = await dbi
                .select()
                .from(advisorAliases)
                .where(eq(advisorAliases.aliasNormalized, advisorRaw))
                .limit(1);
              if (advisorMatch.length > 0) {
                matchedUserId = (advisorMatch[0] as { userId: string }).userId;
              }
            } catch {
              // Ignore match errors
            }
          }

          if (existing.length > 0) {
            // Update existing mapping
            await dbi
              .update(advisorAccountMapping)
              .set({
                advisorName: advisorName,
                advisorRaw: advisorRaw,
                matchedUserId: matchedUserId,
                updatedAt: new Date(),
              })
              .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber));
            updated++;
          } else {
            // Insert new mapping
            await dbi.insert(advisorAccountMapping).values({
              accountNumber: normalizedAccountNumber,
              advisorName: advisorName,
              advisorRaw: advisorRaw,
              matchedUserId: matchedUserId,
            });
            inserted++;
          }
        } catch (error) {
          errors++;
          req.log?.error?.(
            {
              err: error,
              accountNumber: normalizedAccountNumber,
              filename: file.originalname,
            },
            'Error procesando fila de mapeo asesor'
          );
        }
      }

      // Cleanup temp file
      try {
        await fs.unlink(file.path);
      } catch {
        // Ignore cleanup error
      }

      req.log?.info?.(
        {
          inserted,
          updated,
          errors,
          total: parsedRows.length,
        },
        'Advisor mapping uploaded successfully'
      );

      return res.status(201).json({
        ok: true,
        message: 'Mapeo de asesores cargado exitosamente',
        totals: {
          inserted,
          updated,
          errors,
          total: parsedRows.length,
        },
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM advisor mapping upload failed');
      return res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
