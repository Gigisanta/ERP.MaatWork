/**
 * Contacts Assignment Routes
 * 
 * Handles contact assignment operations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, contactFieldHistory } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/common-schemas';
import { HttpError } from '../../utils/route-handler';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const nextStepSchema = z.object({
  nextStep: z.string().max(500).optional().nullable()
});

// ==========================================================
// Routes
// ==========================================================

/**
 * PATCH /contacts/:id/next-step - Actualizar próximo paso
 */
router.patch('/:id/next-step', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: nextStepSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nextStep } = req.body;

    // Verificar que el contacto existe
    const [existing] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new HttpError(404, 'Contact not found');
    }

    // Actualizar solo el próximo paso
    const [updated] = await db()
      .update(contacts)
      .set({ 
        nextStep,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();

    // Registrar en historial si el valor cambió
    if (existing.nextStep !== nextStep) {
      await db()
        .insert(contactFieldHistory)
        .values({
          contactId: id,
          fieldName: 'nextStep',
          oldValue: existing.nextStep || '',
          newValue: nextStep || '',
          changedByUserId: req.user!.id
        });
    }

    req.log.info({ contactId: id, nextStep }, 'contact next step updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to update contact next step');
    next(err);
  }
});

export default router;

