import { Router, type Request, type Response } from 'express';
import { db, attachments } from '@cactus/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';
import { validate } from '../utils/validation';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  sanitizeFilename,
  validateExtensionVsMimeType,
  ensureUploadDir,
  MIME_TYPES,
  DEFAULT_UPLOAD_DIR,
} from '../utils/file-upload';
import { createRouteHandler, createAsyncHandler, HttpError } from '../utils/route-handler';
import { createErrorResponse, getStatusCodeFromError } from '../utils/error-response';
import { idParamSchema, uuidSchema } from '../utils/common-schemas';

const router = Router();

// Configuración de almacenamiento con multer
const uploadsDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;

// Asegurar que el directorio de uploads existe
ensureUploadDir(uploadsDir).catch((err) => {
  logger.error({ err }, 'Error creando directorio uploads');
});

// Storage configuration for entity-based directories
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { entity, entityId } = req.body;
    const entityDir = path.join(uploadsDir, entity || 'general', entityId || 'temp');
    try {
      await ensureUploadDir(entityDir);
      cb(null, entityDir);
    } catch (err: unknown) {
      cb(err instanceof Error ? err : new Error(String(err)), entityDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginal);
    const basename = path.basename(sanitizedOriginal, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// File filter using centralized MIME types and validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar MIME type permitido
  if (!MIME_TYPES.ATTACHMENTS.includes(file.mimetype as (typeof MIME_TYPES.ATTACHMENTS)[number])) {
    return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }

  // Validate extension vs MIME type for security
  if (!validateExtensionVsMimeType(file.originalname, file.mimetype)) {
    return cb(
      new Error(
        `Extensión de archivo no coincide con tipo MIME declarado. Extensión: ${path.extname(file.originalname)}, MIME: ${file.mimetype}`
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Schema de validación
const uploadSchema = z.object({
  entity: z.enum(['contact', 'note', 'meeting']),
  entityId: uuidSchema,
  description: z.string().optional(),
});

// POST /attachments/upload - Subir uno o múltiples archivos
router.post(
  '/upload',
  requireAuth,
  upload.array('files', 10), // Máximo 10 archivos a la vez
  validate({ body: uploadSchema }), // Validar después de multer procese el form-data
  createAsyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new HttpError(400, 'No se recibieron archivos');
    }

    const { entity, entityId } = req.body as z.infer<typeof uploadSchema>;
    const userId = req.user!.id;

    // Verificar que la entidad existe y user has access
    if (entity === 'contact') {
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, entityId);

      if (!hasAccess) {
        req.log.warn(
          {
            contactId: entityId,
            userId,
            userRole,
          },
          'user attempted to upload attachment to inaccessible contact'
        );

        // Limpiar archivos subidos
        for (const file of req.files) {
          await fs.unlink(file.path).catch(() => {});
        }
        throw new HttpError(404, 'Contacto no encontrado');
      }
    }

    // Crear registros de adjuntos en la base de datos
    const newAttachments = [];
    for (const file of req.files) {
      const attachmentData = {
        filename: path.basename(file.path),
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        uploadedByUserId: userId,
        ...(entity === 'contact' ? { contactId: entityId } : {}),
        ...(entity === 'note' ? { noteId: entityId } : {}),
      };

      const [newAttachment] = await db().insert(attachments).values(attachmentData).returning();
      newAttachments.push(newAttachment);
    }

    req.log.info({ count: newAttachments.length, entity, entityId }, 'Archivos subidos exitosamente');

    return res.status(201).json({
      success: true,
      data: newAttachments,
      requestId: req.requestId,
    });
  })
);

// GET /attachments/:id - Obtener metadata de un adjunto
router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
      with: {
        uploadedByUser: true,
      },
    });

    if (!attachment) {
      throw new HttpError(404, 'Adjunto no encontrado');
    }

    return attachment;
  })
);

// GET /attachments/:id/download - Descargar archivo
router.get(
  '/:id/download',
  requireAuth,
  validate({ params: idParamSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      throw new HttpError(404, 'Adjunto no encontrado');
    }

    // Verificar que el archivo existe
    try {
      await fs.access(attachment.filePath);
    } catch {
      req.log.error({ attachmentId: id, path: attachment.filePath }, 'Archivo no encontrado en disco');
      throw new HttpError(404, 'Archivo no encontrado en el servidor');
    }

    // Establecer headers para descarga
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Length', attachment.fileSize.toString());

    // Stream del archivo
    const fileStream = (await import('fs')).createReadStream(attachment.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      req.log.error({ err, attachmentId: id }, 'Error al streamear archivo');
      if (!res.headersSent) {
        const statusCode = getStatusCodeFromError(err);
        return res.status(statusCode).json(
          createErrorResponse({
            error: err,
            requestId: req.requestId,
            userMessage: 'Error al descargar archivo',
          })
        );
      }
    });
  })
);

// GET /attachments/:id/preview - Vista previa (solo imágenes)
router.get(
  '/:id/preview',
  requireAuth,
  validate({ params: idParamSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      throw new HttpError(404, 'Adjunto no encontrado');
    }

    // Solo permitir preview de imágenes
    if (!attachment.mimeType.startsWith('image/')) {
      throw new HttpError(400, 'Preview solo disponible para imágenes');
    }

    try {
      await fs.access(attachment.filePath);
    } catch {
      throw new HttpError(404, 'Archivo no encontrado en el servidor');
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 día

    const fileStream = (await import('fs')).createReadStream(attachment.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      req.log.error({ err, attachmentId: id }, 'Error al streamear preview');
      if (!res.headersSent) {
        const statusCode = getStatusCodeFromError(err);
        return res.status(statusCode).json(
          createErrorResponse({
            error: err,
            requestId: req.requestId,
            userMessage: 'Error al generar preview',
          })
        );
      }
    });
  })
);

// DELETE /attachments/:id - Soft delete de adjunto
router.delete(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      throw new HttpError(404, 'Adjunto no encontrado');
    }

    // Soft delete
    await db().update(attachments).set({ deletedAt: new Date() }).where(eq(attachments.id, id));

    req.log.info({ attachmentId: id }, 'Adjunto eliminado (soft delete)');

    return { deleted: true };
  })
);

// GET /attachments/entity/:entity/:entityId - Listar adjuntos de una entidad
router.get(
  '/entity/:entity/:entityId',
  requireAuth,
  createRouteHandler(async (req: Request) => {
    const { entity, entityId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let whereClause;
    if (entity === 'contact') {
      // Verify user has access to this contact
      const hasAccess = await canAccessContact(userId, userRole, entityId);
      if (!hasAccess) {
        req.log.warn(
          {
            contactId: entityId,
            userId,
            userRole,
          },
          'user attempted to list attachments for inaccessible contact'
        );
        throw new HttpError(404, 'Contacto no encontrado');
      }
      whereClause = and(eq(attachments.contactId, entityId), isNull(attachments.deletedAt));
    } else if (entity === 'note') {
      whereClause = and(eq(attachments.noteId, entityId), isNull(attachments.deletedAt));
    } else {
      throw new HttpError(400, 'Entidad no válida');
    }

    const entityAttachments = await db().query.attachments.findMany({
      where: whereClause,
      with: {
        uploadedByUser: true,
      },
      orderBy: desc(attachments.createdAt),
    });

    return entityAttachments;
  })
);

export default router;
