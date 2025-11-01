import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, attachments, contacts } from '@cactus/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

const router = Router();

// Configuración de almacenamiento con multer
const uploadsDir = path.join(process.cwd(), 'uploads');

// Asegurar que el directorio de uploads existe
(async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Error creando directorio uploads:', err);
  }
})();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { entity, entityId } = req.body;
    const entityDir = path.join(uploadsDir, entity || 'general', entityId || 'temp');
    try {
      await fs.mkdir(entityDir, { recursive: true });
      cb(null, entityDir);
    } catch (err: unknown) {
      cb(err, entityDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// Filtro de tipos de archivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }
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
  entityId: z.string().uuid(),
  description: z.string().optional(),
});

// POST /attachments/upload - Subir uno o múltiples archivos
router.post(
  '/upload',
  requireAuth,
  upload.array('files', 10), // Máximo 10 archivos a la vez
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No se recibieron archivos' });
      }

      const { entity, entityId, description } = uploadSchema.parse(req.body);
      const userId = req.user!.id;

      // Verificar que la entidad existe y user has access
      if (entity === 'contact') {
        const userRole = req.user!.role;
        const hasAccess = await canAccessContact(userId, userRole, entityId);
        
        if (!hasAccess) {
          req.log.warn({ 
            contactId: entityId, 
            userId, 
            userRole 
          }, 'user attempted to upload attachment to inaccessible contact');
          
          // Limpiar archivos subidos
          for (const file of req.files) {
            await fs.unlink(file.path).catch(() => {});
          }
          return res.status(404).json({ message: 'Contacto no encontrado' });
        }
      }

      // Crear registros de adjuntos en la base de datos
      const newAttachments = [];
      for (const file of req.files) {
        const attachmentData: any = {
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedByUserId: userId,
          description: description || null,
        };

        if (entity === 'contact') {
          attachmentData.contactId = entityId;
        } else if (entity === 'note') {
          attachmentData.noteId = entityId;
        } else if (entity === 'meeting') {
          attachmentData.meetingId = entityId;
        }

        const [newAttachment] = await db().insert(attachments).values(attachmentData).returning();
        newAttachments.push(newAttachment);
      }

      req.log.info(
        { count: newAttachments.length, entity, entityId },
        'Archivos subidos exitosamente'
      );

      res.status(201).json(newAttachments);
    } catch (err) {
      // Limpiar archivos en caso de error
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
      req.log.error({ err }, 'Error al subir archivos');
      next(err);
    }
  }
);

// GET /attachments/:id - Obtener metadata de un adjunto
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
      with: {
        uploadedByUser: true,
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    res.json(attachment);
  } catch (err) {
    req.log.error({ err }, 'Error al obtener adjunto');
    next(err);
  }
});

// GET /attachments/:id/download - Descargar archivo
router.get('/:id/download', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(attachment.filePath);
    } catch {
      req.log.error({ attachmentId: id, path: attachment.filePath }, 'Archivo no encontrado en disco');
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor' });
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
        res.status(500).json({ message: 'Error al descargar archivo' });
      }
    });
  } catch (err) {
    req.log.error({ err }, 'Error al descargar adjunto');
    next(err);
  }
});

// GET /attachments/:id/preview - Vista previa (solo imágenes)
router.get('/:id/preview', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    // Solo permitir preview de imágenes
    if (!attachment.mimeType.startsWith('image/')) {
      return res.status(400).json({ message: 'Preview solo disponible para imágenes' });
    }

    try {
      await fs.access(attachment.filePath);
    } catch {
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 día

    const fileStream = (await import('fs')).createReadStream(attachment.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      req.log.error({ err, attachmentId: id }, 'Error al streamear preview');
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error al generar preview' });
      }
    });
  } catch (err) {
    req.log.error({ err }, 'Error al generar preview');
    next(err);
  }
});

// DELETE /attachments/:id - Soft delete de adjunto
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attachment = await db().query.attachments.findFirst({
      where: and(eq(attachments.id, id), isNull(attachments.deletedAt)),
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    // Soft delete
    await db()
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(eq(attachments.id, id));

    req.log.info({ attachmentId: id }, 'Adjunto eliminado (soft delete)');

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Error al eliminar adjunto');
    next(err);
  }
});

// GET /attachments/entity/:entity/:entityId - Listar adjuntos de una entidad
router.get(
  '/entity/:entity/:entityId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entity, entityId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      let whereClause;
      if (entity === 'contact') {
        // Verify user has access to this contact
        const hasAccess = await canAccessContact(userId, userRole, entityId);
        if (!hasAccess) {
          req.log.warn({ 
            contactId: entityId, 
            userId, 
            userRole 
          }, 'user attempted to list attachments for inaccessible contact');
          return res.status(404).json({ message: 'Contacto no encontrado' });
        }
        whereClause = and(eq(attachments.contactId, entityId), isNull(attachments.deletedAt));
      } else if (entity === 'note') {
        whereClause = and(eq(attachments.noteId, entityId), isNull(attachments.deletedAt));
      } else {
        return res.status(400).json({ message: 'Entidad no válida' });
      }

      const entityAttachments = await db().query.attachments.findMany({
        where: whereClause,
        with: {
          uploadedByUser: true,
        },
        orderBy: desc(attachments.createdAt),
      });

      res.json(entityAttachments);
    } catch (err) {
      req.log.error({ err }, 'Error al listar adjuntos de entidad');
      next(err);
    }
  }
);

export default router;

