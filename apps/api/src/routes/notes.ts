// REGLA CURSOR: Notes CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, notes } from '@cactus/db';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { uuidSchema, idParamSchema, paginationQuerySchema } from '../utils/common-schemas';

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
router.get(
  '/',
  requireAuth,
  validate({ 
    query: paginationQuerySchema.and(
      z.object({ contactId: uuidSchema })
    )
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      contactId,
      limit = '50',
      offset = '0'
    } = req.query as { contactId: string; limit?: string; offset?: string };
    
    // AI_DECISION: Validate contactId before processing
    // Justificación: Prevent errors from invalid or missing contactId
    // Impacto: More robust error handling, clearer error messages
    if (!contactId || typeof contactId !== 'string') {
      return res.status(400).json({ error: 'contactId is required and must be a valid UUID' });
    }
    
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar que el usuario tenga acceso al contacto
    const hasAccess = await canAccessContact(userId, userRole, contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    // AI_DECISION: Validate and sanitize pagination parameters
    // Justificación: Prevent invalid values that could cause errors or performance issues
    // Impacto: More robust error handling, prevents SQL injection-like issues
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

    const notesList = await db()
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.contactId, contactId),
          isNull(notes.deletedAt)
        )
      )
      .orderBy(desc(notes.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Get total count for pagination metadata
    // AI_DECISION: Handle count query safely to prevent errors if query fails
    // Justificación: Count query could fail or return empty array, need safe handling
    // Impacto: Prevents runtime errors, more robust error handling
    const countResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(
        and(
          eq(notes.contactId, contactId),
          isNull(notes.deletedAt)
        )
      );
    
    const totalCount = countResult[0]?.count ? Number(countResult[0].count) : 0;

    req.log.info({ contactId, count: notesList.length, total: totalCount }, 'notes fetched');
    res.json({ 
      success: true, 
      data: notesList,
      pagination: {
        total: Number(totalCount),
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < Number(totalCount)
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to fetch notes');
    next(err);
  }
});

// ==========================================================
// GET /notes/:id - Obtener nota específica
// ==========================================================
router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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
    res.json({ success: true, data: note });
  } catch (err) {
    req.log.error({ err, noteId: req.params.id }, 'failed to fetch note');
    next(err);
  }
});

// ==========================================================
// POST /notes - Crear nota manual
// ==========================================================
router.post(
  '/',
  requireAuth,
  validate({ body: createNoteSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body as z.infer<typeof createNoteSchema>;
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
    req.log.error({ err }, 'failed to create note');
    next(err);
  }
});

// ==========================================================
// PUT /notes/:id - Actualizar nota
// ==========================================================
router.put(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateNoteSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = req.body as z.infer<typeof updateNoteSchema>;
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
    res.json({ success: true, data: updated });
  } catch (err) {
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
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, noteId: req.params.id }, 'failed to delete note');
    next(err);
  }
});

export default router;
