// REGLA CURSOR: Notes CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, notes } from '@cactus/db';
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm';
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

    // AI_DECISION: Optimize COUNT query using window function
    // Justificación: Reduces from 2 queries to 1 query, improves performance
    // Impacto: Single database round-trip instead of two parallel queries
    const whereConditions = and(
      eq(notes.contactId, contactId),
      isNull(notes.deletedAt)
    );

    const notesList = await db()
      .select({
        id: notes.id,
        contactId: notes.contactId,
        authorUserId: notes.authorUserId,
        source: notes.source,
        noteType: notes.noteType,
        content: notes.content,
        deletedAt: notes.deletedAt,
        createdAt: notes.createdAt,
        total: sql<number>`count(*) OVER()`.as('total')
      })
      .from(notes)
      .where(whereConditions)
      .orderBy(desc(notes.createdAt))
      .limit(limitNum)
      .offset(offsetNum);
    
    // Extract total from first item (all items have same total value)
    const totalCount = notesList.length > 0 ? Number((notesList[0] as typeof notesList[0] & { total: number }).total) : 0;
    
    // Remove total from items
    type NoteWithTotal = typeof notesList[0] & { total: number };
    const notesListWithoutTotal = notesList.map(({ total: _total, ...note }: NoteWithTotal) => note);

    req.log.info({ contactId, count: notesListWithoutTotal.length, total: totalCount }, 'notes fetched');
    res.json({ 
      success: true, 
      data: notesListWithoutTotal,
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
// GET /notes/batch - Obtener notas de múltiples contactos (batch)
// ==========================================================
const batchNotesQuerySchema = z.object({
  contactIds: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

router.get('/batch',
  requireAuth,
  validate({ query: batchNotesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateBatchIds } = await import('../utils/batch-validation');
      
      const validation = validateBatchIds(req.query.contactIds as string, {
        maxCount: 50, // Límite específico para notes batch
        fieldName: 'contactIds'
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid contact IDs',
          details: validation.errors
        });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      
      // Verificar acceso a contactos
      const accessibleContactIds: string[] = [];
      for (const contactId of validation.ids) {
        const hasAccess = await canAccessContact(userId, userRole, contactId);
        if (hasAccess) {
          accessibleContactIds.push(contactId);
        }
      }

      if (accessibleContactIds.length === 0) {
        return res.status(403).json({ error: 'No access to any of the specified contacts' });
      }

      // Obtener notas de todos los contactos accesibles en una sola query
      const notesList = await db()
        .select()
        .from(notes)
        .where(
          and(
            inArray(notes.contactId, accessibleContactIds),
            isNull(notes.deletedAt)
          )
        )
        .orderBy(desc(notes.createdAt))
        .limit(limit * accessibleContactIds.length) // Limitar por número de contactos
        .offset(offset);

      // Agrupar por contactId
      const notesByContactId: Record<string, typeof notesList> = {};
      for (const note of notesList) {
        if (!notesByContactId[note.contactId]) {
          notesByContactId[note.contactId] = [];
        }
        notesByContactId[note.contactId].push(note);
      }

      // Asegurar que todos los contactos accesibles estén en el resultado (aunque no tengan notas)
      for (const contactId of accessibleContactIds) {
        if (!notesByContactId[contactId]) {
          notesByContactId[contactId] = [];
        }
      }

      req.log.info({ 
        requested: validation.ids.length, 
        accessible: accessibleContactIds.length,
        withNotes: Object.keys(notesByContactId).filter(id => notesByContactId[id].length > 0).length 
      }, 'notes batch fetched');

      res.json({ 
        success: true, 
        data: notesByContactId 
      });
    } catch (err) {
      req.log.error({ err }, 'failed to fetch notes batch');
      next(err);
    }
  }
);

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
