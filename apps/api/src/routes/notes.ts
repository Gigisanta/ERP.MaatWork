// REGLA CURSOR: Notes CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, notes } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createNoteSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1),
  noteType: z.enum(['general', 'summary', 'action_items']).default('general'),
  source: z.enum(['manual', 'ai', 'import']).default('manual')
});

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  noteType: z.enum(['general', 'summary', 'action_items']).optional()
});

// ==========================================================
// GET /notes - Listar notas de un contacto
// ==========================================================
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    // Verificar que el usuario tenga acceso al contacto
    const hasAccess = await canAccessContact(userId, userRole, contactId as string);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    const notesList = await db()
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.contactId, contactId as string),
          isNull(notes.deletedAt)
        )
      )
      .orderBy(notes.createdAt);

    req.log.info({ contactId, count: notesList.length }, 'notes fetched');
    res.json({ data: notesList });
  } catch (err) {
    req.log.error({ err }, 'failed to fetch notes');
    next(err);
  }
});

// ==========================================================
// GET /notes/:id - Obtener nota específica
// ==========================================================
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const [note] = await db()
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          isNull(notes.deletedAt)
        )
      )
      .limit(1);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, note.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this note' });
    }

    req.log.info({ noteId: id }, 'note fetched');
    res.json({ data: note });
  } catch (err) {
    req.log.error({ err, noteId: req.params.id }, 'failed to fetch note');
    next(err);
  }
});

// ==========================================================
// POST /notes - Crear nota manual
// ==========================================================
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createNoteSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar que el usuario tenga acceso al contacto
    const hasAccess = await canAccessContact(userId, userRole, validated.contactId);
    if (!hasAccess) {
      req.log.warn({ contactId: validated.contactId, userId }, 'user attempted to create note for inaccessible contact');
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    const [newNote] = await db()
      .insert(notes)
      .values({
        ...validated,
        authorUserId: userId
      })
      .returning();

    req.log.info({ noteId: newNote.id, contactId: validated.contactId }, 'note created');
    res.status(201).json({ data: newNote });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create note');
    next(err);
  }
});

// ==========================================================
// PUT /notes/:id - Actualizar nota
// ==========================================================
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateNoteSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Obtener la nota existente
    const [existing] = await db()
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          isNull(notes.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this note' });
    }

    const [updated] = await db()
      .update(notes)
      .set(validated)
      .where(eq(notes.id, id))
      .returning();

    req.log.info({ noteId: id }, 'note updated');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, noteId: req.params.id }, 'failed to update note');
    next(err);
  }
});

// ==========================================================
// DELETE /notes/:id - Eliminar nota (soft delete)
// ==========================================================
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Obtener la nota existente
    const [existing] = await db()
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          isNull(notes.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this note' });
    }

    // Soft delete
    await db()
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(eq(notes.id, id));

    req.log.info({ noteId: id }, 'note deleted');
    res.json({ data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, noteId: req.params.id }, 'failed to delete note');
    next(err);
  }
});

export default router;
