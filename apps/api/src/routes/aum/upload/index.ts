/**
 * AUM Upload Routes
 *
 * AI_DECISION: Modularizar endpoints de upload en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { AUM_LIMITS } from '../../../config/aum-limits';
import {
  createAumUpload,
  handleMulterError,
  DEFAULT_UPLOAD_DIR,
} from '../../../utils/file/file-upload';
import {
  aumFileIdParamsSchema,
  aumUploadQuerySchema,
  aumPreviewQuerySchema,
  aumHistoryQuerySchema,
  aumExportQuerySchema,
} from '../../../utils/aum/aum-validation';

// Import handlers
import { handleUpload } from './handlers/upload';
import { handlePreview } from './handlers/preview';
import { handleHistory } from './handlers/history';
import { handleExport } from './handlers/export';
import { matchRow } from '../rows/handlers/match';
import { aumMatchRowBodySchema } from '../../../utils/aum/aum-validation';

const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
// ==========================================================

const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const upload = createAumUpload(AUM_LIMITS.MAX_FILE_SIZE, uploadDir);

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /admin/aum/uploads
 * Upload and parse AUM file
 */
router.post(
  '/uploads',
  requireAuth,
  requireRole(['admin']),
  validate({ query: aumUploadQuerySchema }),
  (req, res, next) => {
    // Middleware para manejar errores de multer antes de llegar al handler
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
  handleUpload
);

/**
 * GET /admin/aum/uploads/:fileId/preview
 * Preview rows from uploaded file
 */
router.get(
  '/uploads/:fileId/preview',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, query: aumPreviewQuerySchema }),
  handlePreview
);

/**
 * GET /admin/aum/uploads/history
 * Get upload history
 */
router.get(
  '/uploads/history',
  requireAuth,
  validate({ query: aumHistoryQuerySchema }),
  handleHistory
);

/**
 * GET /admin/aum/uploads/:fileId/export
 * Export rows from uploaded file as CSV
 */
router.get(
  '/uploads/:fileId/export',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, query: aumExportQuerySchema }),
  handleExport
);

/**
 * POST /admin/aum/uploads/:fileId/match
 * Manually match a row with contact and/or advisor
 */
router.post(
  '/uploads/:fileId/match',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, body: aumMatchRowBodySchema }),
  matchRow
);

export default router;
