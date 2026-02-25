/**
 * Capacitaciones CRUD Handlers
 *
 * GET /capacitaciones/:id - Get capacitacion by ID
 * POST /capacitaciones - Create capacitacion
 * PUT /capacitaciones/:id - Update capacitacion
 * DELETE /capacitaciones/:id - Delete capacitacion
 */
import type { Request, Response } from 'express';
import { db, capacitaciones } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { createCapacitacionSchema, updateCapacitacionSchema } from '../schemas';
import { z } from 'zod';

/**
 * GET /capacitaciones/:id - Get capacitacion by ID
 */
export const handleGetCapacitacion = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [capacitacion] = await db()
    .select()
    .from(capacitaciones)
    .where(eq(capacitaciones.id, id))
    .limit(1);

  if (!capacitacion) {
    throw new HttpError(404, 'Capacitación no encontrada');
  }

  req.log?.info?.({ capacitacionId: id }, 'capacitacion fetched');

  return capacitacion;
});

/**
 * POST /capacitaciones - Create capacitacion
 */
export const handleCreateCapacitacion = createAsyncHandler(async (req: Request, res: Response) => {
  const validated = req.body as z.infer<typeof createCapacitacionSchema>;
  const userId = req.user!.id;

  const fecha = validated.fecha ? new Date(validated.fecha) : null;

  const [newCapacitacion] = await db()
    .insert(capacitaciones)
    .values({
      titulo: validated.titulo,
      tema: validated.tema,
      link: validated.link,
      fecha,
      createdByUserId: userId,
    })
    .returning();

  req.log?.info?.({ capacitacionId: newCapacitacion.id }, 'capacitacion created');

  return res.status(201).json({
    success: true,
    data: newCapacitacion,
    requestId: req.requestId,
  });
});

/**
 * PUT /capacitaciones/:id - Update capacitacion
 */
export const handleUpdateCapacitacion = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const validated = req.body as z.infer<typeof updateCapacitacionSchema>;

  const [existing] = await db()
    .select()
    .from(capacitaciones)
    .where(eq(capacitaciones.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Capacitación no encontrada');
  }

  const updateData: {
    titulo?: string;
    tema?: string;
    link?: string;
    fecha?: Date | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (validated.titulo !== undefined) {
    updateData.titulo = validated.titulo;
  }
  if (validated.tema !== undefined) {
    updateData.tema = validated.tema;
  }
  if (validated.link !== undefined) {
    updateData.link = validated.link;
  }
  if (validated.fecha !== undefined) {
    updateData.fecha = validated.fecha ? new Date(validated.fecha) : null;
  }

  const [updated] = await db()
    .update(capacitaciones)
    .set(updateData)
    .where(eq(capacitaciones.id, id))
    .returning();

  req.log?.info?.({ capacitacionId: id }, 'capacitacion updated');

  return updated;
});

/**
 * DELETE /capacitaciones/:id - Delete capacitacion
 */
export const handleDeleteCapacitacion = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [existing] = await db()
    .select()
    .from(capacitaciones)
    .where(eq(capacitaciones.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Capacitación no encontrada');
  }

  await db().delete(capacitaciones).where(eq(capacitaciones.id, id));

  req.log?.info?.({ capacitacionId: id }, 'capacitacion deleted');

  return { id, deleted: true };
});
