/**
 * Pipeline Move Routes
 *
 * Handles moving contacts between pipeline stages
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  db,
  pipelineStages,
  contacts,
  pipelineStageHistory,
  automationConfigs,
  contactTags,
  tags,
} from '@maatwork/db';
import { eq, and, isNull, count, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { canAccessContact } from '../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../utils/validation';
import { transactionWithLogging } from '../../utils/database/db-transactions';
import { sendWebhook } from '../../utils/http/webhook-client';
import { invalidateCache } from '../../middleware/cache';
import { HttpError } from '../../utils/route-handler';
import { uuidSchema } from '../../utils/validation/common-schemas';
import { emailAutomationService } from '../../services/automations/email-service';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const moveContactSchema = z.object({
  contactId: uuidSchema,
  toStageId: uuidSchema,
  reason: z.string().max(500).optional().nullable(),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /pipeline/move - Mover contacto entre etapas
 */
router.post(
  '/move',
  requireAuth,
  validate({ body: moveContactSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId, toStageId, reason } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Verify user has access to this contact
      const hasAccess = await canAccessContact(userId, userRole, contactId);
      if (!hasAccess) {
        req.log.warn(
          {
            contactId,
            userId,
            userRole,
          },
          'user attempted to move inaccessible contact in pipeline'
        );
        throw new HttpError(404, 'Contact not found');
      }

      // Obtener contacto actual
      const [contact] = await db()
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), isNull(contacts.deletedAt)))
        .limit(1);

      if (!contact) {
        throw new HttpError(404, 'Contact not found');
      }

      // Obtener etapa destino
      const [toStage] = await db()
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, toStageId))
        .limit(1);

      if (!toStage) {
        throw new HttpError(404, 'Target stage not found');
      }

      // AI_DECISION: Usar transacción para asegurar consistencia y prevenir race conditions
      // Justificación: Validación de WIP limit y update de contacto deben ser atómicos
      // Si WIP limit se excede, toda la operación debe hacer rollback
      // Mover validación dentro de transacción previene race conditions
      // Impacto: WIP limit respetado 100% del tiempo, historial siempre consistente
      const updated = await transactionWithLogging(req.log, 'move-contact-pipeline', async (tx) => {
        // Verificar WIP limit dentro de la transacción (previene race condition)
        if (toStage.wipLimit !== null) {
          const [{ count: currentCount }] = await tx
            .select({ count: count() })
            .from(contacts)
            .where(and(eq(contacts.pipelineStageId, toStageId), isNull(contacts.deletedAt)));

          if (Number(currentCount) >= toStage.wipLimit) {
            req.log.warn(
              { stageId: toStageId, wipLimit: toStage.wipLimit },
              'WIP limit would be exceeded'
            );
            throw new Error('WIP limit exceeded');
          }
        }

        // Actualizar contacto dentro de la transacción
        const updateResult = await tx
          .update(contacts)
          .set({
            pipelineStageId: toStageId,
            pipelineStageUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contactId))
          .returning();

        // Type assertion needed because Drizzle's transaction type inference is complex
        const updatedContacts = updateResult as InferSelectModel<typeof contacts>[];
        const updatedContact = updatedContacts[0];

        if (!updatedContact) {
          throw new Error('Contact not found');
        }

        // Registrar en historial dentro de la transacción (solo si userId es válido)
        if (userId && userId !== '00000000-0000-0000-0000-000000000001') {
          await tx.insert(pipelineStageHistory).values({
            contactId,
            fromStage: contact.pipelineStageId || null,
            toStage: toStageId,
            reason: reason || null,
            changedByUserId: userId,
          });
        } else {
          req.log.info({ userId }, 'Skipping history entry for temp admin user');
        }

        return updatedContact;
      });

      req.log.info(
        { contactId, fromStage: contact.pipelineStageId, toStage: toStageId },
        'contact moved in pipeline'
      );

      // AI_DECISION: Invalidate pipeline metrics cache when stage changes occur
      // Justificación: Pipeline metrics need to reflect latest stage movements
      // Impacto: Ensures cache consistency, prevents stale data
      const { pipelineMetricsCacheUtil } = await import('../../utils/performance/cache');
      pipelineMetricsCacheUtil.invalidateOnStageChange();

      // Invalidate Redis cache for pipeline and contacts
      await invalidateCache('crm:pipeline:*');
      await invalidateCache('crm:contacts:*');

      // Trigger automations (Unified: handles both emails and webhooks)
      emailAutomationService
        .checkAndTriggerAutomations('pipeline_stage_change', {
          contactId,
          userId,
          newPipelineStageId: toStageId,
        })
        .catch((err) => {
          req.log.error({ err }, 'Error triggering automation');
        });

      res.json({ success: true, data: updated });
    } catch (err) {
      // Manejar errores específicos de WIP limit
      if (err instanceof Error && err.message === 'WIP limit exceeded') {
        return res.status(400).json({
          error: 'WIP limit exceeded',
          message:
            'El límite de trabajo en progreso (WIP) para esta etapa ha sido alcanzado. Por favor, mueve contactos a otras etapas primero.',
        });
      }

      req.log.error({ err }, 'failed to move contact in pipeline');
      next(err);
    }
  }
);

export default router;
