/**
 * Notes List Handlers
 *
 * GET /notes - List notes for a contact with pagination
 * GET /notes/batch - Get notes for multiple contacts (batch)
 */
import type { Request } from 'express';
import { db, notes } from '@cactus/db';
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm';
import { canAccessContact } from '../../../auth/authorization';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { parsePaginationParams, formatPaginatedResponse } from '../../../utils/pagination';
import { listNotesQuerySchema, batchNotesQuerySchema } from '../schemas';

/**
 * GET /notes - List notes for a contact with pagination
 */
export const handleListNotes = createRouteHandler(async (req: Request) => {
  const { contactId, limit, offset } = req.query as {
    contactId: string;
    limit?: string;
    offset?: string;
  };

  if (!contactId || typeof contactId !== 'string') {
    throw new HttpError(400, 'contactId is required and must be a valid UUID');
  }

  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verificar que el usuario tenga acceso al contacto
  const hasAccess = await canAccessContact(userId, userRole, contactId);
  if (!hasAccess) {
    throw new HttpError(403, 'Access denied to this contact');
  }

  // Validate and sanitize pagination parameters
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
  const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

  // Optimize COUNT query using window function
  const whereConditions = and(eq(notes.contactId, contactId), isNull(notes.deletedAt));

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
      total: sql<number>`count(*) OVER()`.as('total'),
    })
    .from(notes)
    .where(whereConditions)
    .orderBy(desc(notes.createdAt))
    .limit(limitNum)
    .offset(offsetNum);

  // Extract total from first item (all items have same total value)
  const totalCount =
    notesList.length > 0
      ? Number((notesList[0] as (typeof notesList)[0] & { total: number }).total)
      : 0;

  // Remove total from items
  type NoteWithTotal = (typeof notesList)[0] & { total: number };
  const notesListWithoutTotal = notesList.map(({ total: _total, ...note }: NoteWithTotal) => note);

  req.log.info(
    { contactId, count: notesListWithoutTotal.length, total: totalCount },
    'notes fetched'
  );

  return formatPaginatedResponse(notesListWithoutTotal, totalCount, {
    limit: limitNum,
    offset: offsetNum,
  });
});

/**
 * GET /notes/batch - Get notes for multiple contacts (batch)
 */
export const handleBatchNotes = createRouteHandler(async (req: Request) => {
  const { validateBatchIds } = await import('../../../utils/database/batch-validation');

  const validation = validateBatchIds(req.query.contactIds as string, {
    maxCount: 50, // Límite específico para notes batch
    fieldName: 'contactIds',
  });

  if (!validation.valid) {
    throw new HttpError(400, 'Invalid contact IDs', { errors: validation.errors });
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
    throw new HttpError(403, 'No access to any of the specified contacts');
  }

  // Obtener notas de todos los contactos accesibles en una sola query
  const notesList = await db()
    .select()
    .from(notes)
    .where(and(inArray(notes.contactId, accessibleContactIds), isNull(notes.deletedAt)))
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

  req.log.info(
    {
      requested: validation.ids.length,
      accessible: accessibleContactIds.length,
      withNotes: Object.keys(notesByContactId).filter((id) => notesByContactId[id].length > 0)
        .length,
    },
    'notes batch fetched'
  );

  return notesByContactId;
});
