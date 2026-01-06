/**
 * Image Upload Handler
 *
 * POST /v1/uploads/images - Upload image for email templates
 *
 * AI_DECISION: Usar multer con storage en filesystem local
 * Justificación: Suficiente para MVP, evita complejidad de S3/Cloudinary
 * Impacto: Fácil de migrar a cloud storage en futuro si escala
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../../auth/middlewares';
import { createRouteHandler } from '../../utils/route-handler';
import type { Request, Response } from 'express';

const UPLOAD_DIR = 'uploads/email-images/';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// AI_DECISION: Validación de tipo de archivo por MIME type y extensión
// Justificación: Doble validación previene bypass de seguridad
// Impacto: Solo se permiten imágenes válidas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // AI_DECISION: Usar UUID + extensión original
    // Justificación: Previene colisiones de nombres, mantiene tipo de archivo
    // Impacto: Nombres únicos, seguros, sin caracteres especiales
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Validar MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(
      new Error(`Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`)
    );
    return;
  }

  // Validar extensión
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!allowedExtensions.includes(ext)) {
    cb(new Error(`Extensión no permitida. Solo se permiten: ${allowedExtensions.join(', ')}`));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

const router = Router();

/**
 * POST /v1/uploads/images
 * Upload single image
 */
router.post(
  '/',
  requireAuth,
  upload.single('image'),
  createRouteHandler(async (req: Request) => {
    if (!req.file) {
      throw new Error('No se recibió ninguna imagen');
    }

    // AI_DECISION: Retornar URL relativa, no absoluta
    // Justificación: Permite cambiar dominio sin actualizar DB
    // Impacto: Frontend debe construir URL absoluta en producción
    const imageUrl = `/uploads/${req.file.filename}`;

    req.log.info(
      {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        userId: req.user?.id,
      },
      'Image uploaded successfully'
    );

    return {
      url: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };
  })
);

export default router;
