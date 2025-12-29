/**
 * Contact Interactions Routes
 *
 * Handles incrementing/decrementing interaction counts for contacts in stages
 */

import { Router, type Request } from 'express';
import { db, contactStageInteractions, contacts, pipelineStages } from '@maatwork/db';
import { eq, and, sql, isNull, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { canAccessContact } from '../../auth/authorization';
import { transactionWithLogging } from '../../utils/database/db-transactions';
import { z } from 'zod';
import { validate } from '../../utils/validation';
import { createRouteHandler, HttpError } from '../../utils/route-handler';
import { invalidateCache } from '../../middleware/cache';
import { contactsListCacheUtil } from '../../utils/performance/cache';

import { uuidSchema } from '../../utils/validation/common-schemas';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const interactionSchema = z.object({
  stageId: uuidSchema,
  action: z.enum(['increment', 'decrement']),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /contacts/:id/interaction - Update interaction count
 */
router.post(
  '/:id/interaction',
  // AI_DECISION: Pre-auth logging middleware for debugging connectivity issues
  // Justificación: Reports of "no logging" suggest request might not reach handler or auth fails silently
  // Impacto: Allows tracing request arrival before auth check
  (req, res, next) => {
    req.log.info(
      {
        path: req.path,
        method: req.method,
        params: req.params,
        body: req.body,
        requestId: req.requestId,
      },
      'Interaction request received - pre-auth check'
    );
    next();
  },
  requireAuth,
  validate({
    params: z.object({ id: uuidSchema }),
    body: interactionSchema,
  }),
  createRouteHandler(async (req: Request) => {
    const startTime = Date.now();
    const contactId = req.params.id;
    const { stageId, action } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    req.log.info(
      {
        userId,
        userRole,
        contactId,
        stageId,
        action,
        requestId: req.requestId,
      },
      'Iniciando actualización de interacción'
    );

    // Verify access
    const hasAccess = await canAccessContact(userId, userRole, contactId);
    if (!hasAccess) {
      req.log.warn(
        {
          userId,
          userRole,
          contactId,
        },
        'Acceso denegado para actualizar interacción'
      );
      throw new HttpError(403, 'No tienes permiso para modificar este contacto');
    }

    // Verify contact exists and is not deleted
    const [contact] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), isNull(contacts.deletedAt)))
      .limit(1);

    if (!contact) {
      req.log.warn({ contactId }, 'Contacto no encontrado o eliminado');
      throw new HttpError(404, 'Contacto no encontrado');
    }

    // Verify stage exists
    const [stage] = await db()
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .limit(1);

    if (!stage) {
      req.log.warn({ stageId }, 'Etapa no encontrada');
      throw new HttpError(404, 'Etapa no encontrada');
    }

    // AI_DECISION: Usar transacción para asegurar atomicidad
    // Justificación: Actualización de interactionCount y contactLastTouchAt deben ser atómicos
    // Impacto: Previene inconsistencias si una operación falla
    const result = await transactionWithLogging(
      req.log,
      'update-contact-interaction',
      async (tx) => {
        // Update or insert interaction count
        const interactionResults = (await tx
          .insert(contactStageInteractions)
          .values({
            contactId,
            pipelineStageId: stageId,
            interactionCount: action === 'increment' ? 1 : -1,
            lastInteractionAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              contactStageInteractions.contactId,
              contactStageInteractions.pipelineStageId,
            ],
            set: {
              interactionCount: sql`${contactStageInteractions.interactionCount} + ${
                action === 'increment' ? 1 : -1
              }`,
              lastInteractionAt: new Date(),
            },
          })
          .returning()) as Array<InferSelectModel<typeof contactStageInteractions>>;

        const interaction = interactionResults[0];
        if (!interaction) {
          throw new Error('Failed to create or update interaction');
        }

        // Prevent negative counts
        let finalCount = interaction.interactionCount;
        if (finalCount < 0) {
          req.log.warn(
            { interactionId: interaction.id, finalCount },
            'Negative interaction count detected, resetting to 0'
          );
          await tx
            .update(contactStageInteractions)
            .set({ interactionCount: 0 })
            .where(eq(contactStageInteractions.id, interaction.id));
          finalCount = 0;
        }

        // Update contact last touch and modification time
        await tx
          .update(contacts)
          .set({
            contactLastTouchAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contactId));

        return {
          interactionCount: finalCount,
          lastInteractionAt: interaction.lastInteractionAt,
        };
      }
    );

    // Invalidate caches
    contactsListCacheUtil.clear();
    await invalidateCache('crm:contacts:*');
    // AI_DECISION: Invalidate specific user cache to ensure freshness
    // Justificación: Wildcard might be too broad or miss if pattern matching is strict
    // Impacto: Guarantees the requesting user sees their updates immediately
    await invalidateCache(`crm:contacts:${userId}:*`);
    await invalidateCache('crm:pipeline:*');

    const duration = Date.now() - startTime;
    req.log.info(
      {
        userId,
        userRole,
        contactId,
        stageId,
        action,
        interactionCount: result.interactionCount,
        duration,
        requestId: req.requestId,
      },
      'Interacción actualizada exitosamente'
    );

    return result;
  })
);

export default router;
