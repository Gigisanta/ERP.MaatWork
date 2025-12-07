/**
 * Route Handler Template
 *
 * Copiar este archivo a apps/api/src/routes/[domain]/handlers/[action].ts y reemplazar:
 * - [Domain] con el nombre del dominio (ej: Contact, Task, Portfolio)
 * - [domain] con el nombre en minusculas (ej: contact, task, portfolio)
 * - [action] con la accion (ej: create, get, list, update, delete)
 *
 * Ejemplo de uso:
 * 1. Copiar a apps/api/src/routes/contacts/handlers/create.ts
 * 2. Reemplazar [Domain] -> Contact
 * 3. Reemplazar [domain] -> contact
 * 4. Ajustar schemas y logica segun el dominio
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '@cactus/db';
import { requireAuth } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { createRouteHandler } from '../../../utils/route-handler';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

/**
 * Schema para crear [Domain]
 */
const create[Domain]Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  // Agregar mas campos segun necesidad
});

/**
 * Schema para actualizar [Domain]
 */
const update[Domain]Schema = z.object({
  name: z.string().min(1).max(255).optional(),
  // Agregar mas campos segun necesidad
});

/**
 * Schema para query params de listado
 */
const list[Domain]QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  // Agregar mas filtros segun necesidad
});

/**
 * Schema para params con ID
 */
const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /[domain] - Listar [domain]s
 */
router.get(
  '/',
  requireAuth,
  validate({ query: list[Domain]QuerySchema }),
  createRouteHandler(async (req) => {
    const { page, limit, search } = req.query as z.infer<typeof list[Domain]QuerySchema>;
    const userId = req.user!.id;

    // Implementar logica de listado
    // const [domain]s = await db.query.[domain]s.findMany({
    //   where: { userId },
    //   limit,
    //   offset: (page - 1) * limit,
    // });

    return {
      data: [], // [domain]s
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  })
);

/**
 * GET /[domain]/:id - Obtener [domain] por ID
 */
router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req) => {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const userId = req.user!.id;

    // Implementar logica de obtencion
    // const [domain] = await db.query.[domain]s.findFirst({
    //   where: { id, userId },
    // });

    // if (![domain]) {
    //   throw new Error('[Domain] not found');
    // }

    return {}; // [domain]
  })
);

/**
 * POST /[domain] - Crear [domain]
 */
router.post(
  '/',
  requireAuth,
  validate({ body: create[Domain]Schema }),
  createRouteHandler(async (req) => {
    const data = req.body as z.infer<typeof create[Domain]Schema>;
    const userId = req.user!.id;

    req.log.info({ userId, action: 'create_[domain]' }, 'Creating [domain]');

    // Implementar logica de creacion
    // const [domain] = await db.insert([domain]s).values({
    //   ...data,
    //   userId,
    // }).returning();

    return {}; // [domain][0]
  })
);

/**
 * PATCH /[domain]/:id - Actualizar [domain]
 */
router.patch(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: update[Domain]Schema }),
  createRouteHandler(async (req) => {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const data = req.body as z.infer<typeof update[Domain]Schema>;
    const userId = req.user!.id;

    req.log.info({ userId, [domain]Id: id, action: 'update_[domain]' }, 'Updating [domain]');

    // Verificar que existe y pertenece al usuario
    // const existing = await db.query.[domain]s.findFirst({
    //   where: { id, userId },
    // });

    // if (!existing) {
    //   throw new Error('[Domain] not found');
    // }

    // Actualizar
    // const [domain] = await db.update([domain]s)
    //   .set({ ...data, updatedAt: new Date() })
    //   .where(eq([domain]s.id, id))
    //   .returning();

    return {}; // [domain][0]
  })
);

/**
 * DELETE /[domain]/:id - Eliminar [domain]
 */
router.delete(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req) => {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const userId = req.user!.id;

    req.log.info({ userId, [domain]Id: id, action: 'delete_[domain]' }, 'Deleting [domain]');

    // Verificar que existe y pertenece al usuario
    // const existing = await db.query.[domain]s.findFirst({
    //   where: { id, userId },
    // });

    // if (!existing) {
    //   throw new Error('[Domain] not found');
    // }

    // Eliminar
    // await db.delete([domain]s).where(eq([domain]s.id, id));

    return { deleted: true };
  })
);

export default router;
