import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, notes, audioFiles, contacts, users } from '@cactus/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

const router = Router();

// Función para actualizar timestamp del contacto
async function touchContact(contactId: string): Promise<void> {
  try {
    await db()
      .update(contacts)
      .set({ updatedAt: new Date() })
      .where(eq(contacts.id, contactId));
  } catch (err) {
    console.error('Error updating contact timestamp:', err);
  }
}

// Configuración de almacenamiento para audio
const audioUploadsDir = path.join(process.cwd(), 'uploads', 'audio');

// Asegurar que el directorio existe
(async () => {
  try {
    await fs.mkdir(audioUploadsDir, { recursive: true });
  } catch (err) {
    console.error('Error creando directorio audio:', err);
  }
})();

const audioStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const contactId = req.body.contactId;
    const contactDir = path.join(audioUploadsDir, contactId || 'temp');
    try {
      await fs.mkdir(contactDir, { recursive: true });
      cb(null, contactDir);
    } catch (err: any) {
      cb(err, contactDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const audioFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo de audio no permitido: ${file.mimetype}`));
  }
};

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB para audio
  },
});

// Schemas de validación
const noteSchema = z.object({
  contactId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  content: z.string().min(1),
  type: z.enum(['text', 'call', 'meeting', 'email', 'other']).default('text'),
});

const noteWithAudioSchema = z.object({
  contactId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  title: z.string().optional(),
  type: z.enum(['text', 'call', 'meeting', 'email', 'other']).default('call'),
});

// GET /notes - Listar notas con filtros
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId, meetingId, type } = req.query;

    const whereClause = and(
      isNull(notes.deletedAt),
      contactId ? eq(notes.contactId, contactId as string) : undefined,
      meetingId ? eq(notes.meetingId, meetingId as string) : undefined,
      type ? eq(notes.noteType, type as string) : undefined,
    );

    const allNotes = await db().query.notes.findMany({
      where: whereClause,
      with: {
        contact: true,
        createdByUser: true,
        audioFile: true,
      },
      orderBy: desc(notes.createdAt),
      limit: 100,
    });

    res.json(allNotes);
  } catch (err) {
    req.log.error({ err }, 'Error al listar notas');
    next(err);
  }
});

// GET /notes/:id - Obtener detalle de una nota
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await db().query.notes.findFirst({
      where: and(eq(notes.id, id), isNull(notes.deletedAt)),
      with: {
        contact: true,
        createdByUser: true,
        audioFile: true,
      },
    });

    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    res.json(note);
  } catch (err) {
    req.log.error({ err }, 'Error al obtener nota');
    next(err);
  }
});

// POST /notes - Crear nota de texto simple
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = noteSchema.parse(req.body);
    const userId = req.user!.id;

    // Verificar que el contacto existe
    const contact = await db().query.contacts.findFirst({
      where: eq(contacts.id, validatedData.contactId),
    });
    if (!contact) {
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }

    // Crear nota
    const [newNote] = await db()
      .insert(notes)
      .values({
        ...validatedData,
        createdByUserId: userId,
      })
      .returning();

    // Actualizar último contacto
    await touchContact(validatedData.contactId);

    req.log.info({ noteId: newNote.id, contactId: validatedData.contactId }, 'Nota creada');

    res.status(201).json(newNote);
  } catch (err) {
    req.log.error({ err }, 'Error al crear nota');
    next(err);
  }
});

// POST /notes/upload-audio - Crear nota con audio para transcribir
router.post(
  '/upload-audio',
  requireAuth,
  audioUpload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió archivo de audio' });
      }

      const validatedData = noteWithAudioSchema.parse(req.body);
      const userId = req.user!.id;

      // Verificar que el contacto existe
      const contact = await db().query.contacts.findFirst({
        where: eq(contacts.id, validatedData.contactId),
      });
      if (!contact) {
        // Limpiar archivo subido
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ message: 'Contacto no encontrado' });
      }

      // Crear registro de audio file
      const [newAudioFile] = await db()
        .insert(audioFiles)
        .values({
          contactId: validatedData.contactId,
          filePath: req.file.path,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          durationSeconds: null, // Se actualizará después de procesar
          uploadedByUserId: userId,
        })
        .returning();

      // Crear nota vinculada al audio
      const [newNote] = await db()
        .insert(notes)
        .values({
          contactId: validatedData.contactId,
          meetingId: validatedData.meetingId || null,
          content: validatedData.title || 'Audio subido',
          noteType: validatedData.type,
          audioFileId: newAudioFile.id,
          createdByUserId: userId,
        })
        .returning();

      // Actualizar último contacto
      await touchContact(validatedData.contactId);

      req.log.info(
        { noteId: newNote.id, audioFileId: newAudioFile.id, contactId: validatedData.contactId },
        'Nota con audio creada'
      );

      // Procesamiento de audio removido

      res.status(201).json({ note: newNote, audioFile: newAudioFile });
    } catch (err) {
      // Limpiar archivo en caso de error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      req.log.error({ err }, 'Error al subir audio');
      next(err);
    }
  }
);

// PUT /notes/:id - Actualizar nota
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;

    const note = await db().query.notes.findFirst({
      where: and(eq(notes.id, id), isNull(notes.deletedAt)),
    });

    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    const [updatedNote] = await db()
      .update(notes)
      .set({
        content: content || note.content,
        type: type || note.type,
      })
      .where(eq(notes.id, id))
      .returning();

    req.log.info({ noteId: id }, 'Nota actualizada');

    res.json(updatedNote);
  } catch (err) {
    req.log.error({ err }, 'Error al actualizar nota');
    next(err);
  }
});

// DELETE /notes/:id - Soft delete de nota
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await db().query.notes.findFirst({
      where: and(eq(notes.id, id), isNull(notes.deletedAt)),
    });

    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    await db().update(notes).set({ deletedAt: new Date() }).where(eq(notes.id, id));

    req.log.info({ noteId: id }, 'Nota eliminada (soft delete)');

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Error al eliminar nota');
    next(err);
  }
});

// GET /notes/audio/:audioFileId/download - Descargar archivo de audio
router.get(
  '/audio/:audioFileId/download',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { audioFileId } = req.params;
      const audioFile = await db().query.audioFiles.findFirst({
        where: eq(audioFiles.id, audioFileId),
      });

      if (!audioFile) {
        return res.status(404).json({ message: 'Archivo de audio no encontrado' });
      }

      // Verificar que el archivo existe
      try {
        await fs.access(audioFile.filePath);
      } catch {
        req.log.error({ audioFileId, path: audioFile.filePath }, 'Archivo de audio no encontrado en disco');
        return res.status(404).json({ message: 'Archivo no encontrado en el servidor' });
      }

      res.setHeader('Content-Type', audioFile.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${audioFile.fileName}"`);
      res.setHeader('Content-Length', audioFile.fileSize.toString());

      const fileStream = (await import('fs')).createReadStream(audioFile.filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        req.log.error({ err, audioFileId }, 'Error al streamear audio');
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error al descargar audio' });
        }
      });
    } catch (err) {
      req.log.error({ err }, 'Error al descargar audio');
      next(err);
    }
  }
);

export default router;

