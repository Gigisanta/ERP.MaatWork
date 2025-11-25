/**
 * AUM Admin - Advisor Mapping Routes
 * 
 * Handles advisor-account mapping file uploads
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { db, advisorAccountMapping, advisorAliases } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { AUM_LIMITS } from '../../../config/aum-limits';
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../../../utils/aum-normalization';
import { parseAumFile } from '../../../services/aumParser';

const router = Router();

// File Upload Configuration
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
        req.log?.error?.({ err, filename: (req as { file?: { originalname?: string } }).file?.originalname }, 'Error en multer upload');
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

      const file = (req as { file?: Express.Multer.File }).file;
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
                matchedUserId = (advisorMatch[0] as { userId: string }).userId;
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

export default router;

