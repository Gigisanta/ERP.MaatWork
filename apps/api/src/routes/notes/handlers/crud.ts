/**
 * Notes CRUD Handlers
 *
 * GET /notes/:id - Get note by ID
 * POST /notes - Create note
 * PUT /notes/:id - Update note
 * DELETE /notes/:id - Delete note (soft delete)
 */
import type { Request, Response } from 'express';
import { db, notes } from '@maatwork/db';
import { eq, and, isNull } from 'drizzle-orm';
import { canAccessContact } from '../../../auth/authorization';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { createNoteSchema, updateNoteSchema } from '../schemas';
import { z } from 'zod';

/**
 * GET /notes/:id - Get note by ID
 */
export const handleGetNote = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const [note] = await db()
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);

  if (!note) {
    throw new HttpError(404, 'Note not found');
  }

  // Verificar que el usuario tenga acceso al contacto asociado
  const hasAccess = await canAccessContact(userId, userRole, note.contactId);
  if (!hasAccess) {
    throw new HttpError(403, 'Access denied to this note');
  }

  req.log.info({ noteId: id }, 'note fetched');

  return note;
});

/**
 * POST /notes - Create note
 */
export const handleCreateNote = createAsyncHandler(async (req: Request, res: Response) => {
  const validated = req.body as z.infer<typeof createNoteSchema>;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verificar que el usuario tenga acceso al contacto
  const hasAccess = await canAccessContact(userId, userRole, validated.contactId);
  if (!hasAccess) {
    req.log.warn(
      { contactId: validated.contactId, userId },
      'user attempted to create note for inaccessible contact'
    );
    throw new HttpError(403, 'Access denied to this contact');
  }

  const [newNote] = await db()
    .insert(notes)
    .values({
      ...validated,
      authorUserId: userId,
    })
    .returning();

  req.log.info({ noteId: newNote.id, contactId: validated.contactId }, 'note created');

  return res.status(201).json({
    success: true,
    data: newNote,
    requestId: req.requestId,
  });
});

/**
 * PUT /notes/:id - Update note
 */
export const handleUpdateNote = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const validated = req.body as z.infer<typeof updateNoteSchema>;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Obtener la nota existente
  const [existing] = await db()
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Note not found');
  }

  // Verificar que el usuario tenga acceso al contacto asociado
  const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
  if (!hasAccess) {
    throw new HttpError(403, 'Access denied to this note');
  }

  const [updated] = await db().update(notes).set(validated).where(eq(notes.id, id)).returning();

  req.log.info({ noteId: id }, 'note updated');

  return updated;
});

/**
 * DELETE /notes/:id - Delete note (soft delete)
 */
export const handleDeleteNote = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Obtener la nota existente
  const [existing] = await db()
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Note not found');
  }

  // Verificar que el usuario tenga acceso al contacto asociado
  const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
  if (!hasAccess) {
    throw new HttpError(403, 'Access denied to this note');
  }

  // Soft delete
  await db().update(notes).set({ deletedAt: new Date() }).where(eq(notes.id, id));

  req.log.info({ noteId: id }, 'note deleted');

  return { id, deleted: true };
});








