/**
 * Contacts Import Router
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { createCsvUpload, createUploadMiddleware } from '../../utils/file/file-upload';
import { handleImport } from './handlers/import';

const router = Router();

// Configuración de multer para importación de contactos (CSV)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const upload = createCsvUpload(MAX_FILE_SIZE);
const uploadMiddleware = createUploadMiddleware(upload, 'file', {
  maxFileSize: MAX_FILE_SIZE,
});

/**
 * POST /contacts/import
 * Importar contactos desde CSV
 */
router.post('/import', requireAuth, requireRole(['admin']), uploadMiddleware, handleImport);

export default router;
