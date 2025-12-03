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
} from '@cactus/db';
import { eq, and, isNull, count, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { canAccessContact } from '../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../utils/validation';
import { transactionWithLogging } from '../../utils/db-transactions';
import { sendWebhook } from '../../utils/webhook-client';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const moveContactSchema = z.object({
  contactId: z.string().uuid(),
  toStageId: z.string().uuid(),
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
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Obtener contacto actual
      const [contact] = await db()
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), isNull(contacts.deletedAt)))
        .limit(1);

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Obtener etapa destino
      const [toStage] = await db()
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, toStageId))
        .limit(1);

      if (!toStage) {
        return res.status(404).json({ error: 'Target stage not found' });
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
      const { pipelineMetricsCacheUtil } = await import('../../utils/cache');
      pipelineMetricsCacheUtil.invalidateOnStageChange();

      // Buscar automatización configurada para este cambio de etapa
      const [automationConfig] = await db()
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.triggerType, 'pipeline_stage_change'),
            eq(automationConfigs.enabled, true),
            sql`${automationConfigs.triggerConfig}->>'stageName' = ${toStage.name}`
          )
        )
        .limit(1);

      // Si hay configuración y está habilitada, enviar webhook
      if (automationConfig && automationConfig.webhookUrl) {
        const nombre = updated.firstName; // Solo el nombre, no el apellido
        const email = updated.email;

        // AI_DECISION: Obtener tags/productos del contacto para incluir en webhook
        // Justificación: Permite automatizar emails con información de productos (línea de negocio, prima, póliza)
        // Impacto: Webhooks más ricos para personalización de comunicaciones
        const contactTagsData = await db()
          .select({
            tagId: contactTags.tagId,
            tagName: tags.name,
            tagColor: tags.color,
            tagIcon: tags.icon,
            tagDescription: tags.description,
            businessLine: tags.businessLine,
            monthlyPremium: contactTags.monthlyPremium,
            policyNumber: contactTags.policyNumber,
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(eq(contactTags.contactId, contactId));

        // Formatear productos para el payload
        const productos = contactTagsData.map((tag: (typeof contactTagsData)[number]) => ({
          nombre: tag.tagName,
          lineaDeNegocio: tag.businessLine,
          descripcion: tag.tagDescription,
          primaMensual: tag.monthlyPremium,
          numeroPoliza: tag.policyNumber,
          color: tag.tagColor,
          icono: tag.tagIcon,
        }));

        req.log.info(
          {
            contactId,
            contactFirstName: nombre,
            contactEmail: email,
            webhookUrl: automationConfig.webhookUrl,
            automationConfigId: automationConfig.id,
            stageName: toStage.name,
            productosCount: productos.length,
          },
          'Contact moved to stage, triggering automation webhook'
        );

        // Construir payload con información completa del contacto y sus productos
        const basePayload = {
          nombre,
          apellido: updated.lastName,
          nombreCompleto: updated.fullName ?? `${updated.firstName} ${updated.lastName}`,
          email: email ?? null,
          telefono: updated.phone ?? null,
          pais: updated.country ?? null,
          dni: updated.dni ?? null,
          etapaActual: toStage.name,
          productos,
        };

        // Merge con payload personalizado si existe en la configuración
        const payload =
          automationConfig.config &&
          typeof automationConfig.config === 'object' &&
          'payload' in automationConfig.config
            ? { ...(automationConfig.config.payload as Record<string, unknown>), ...basePayload }
            : basePayload;

        // Enviar webhook de forma asíncrona (fire-and-forget)
        sendWebhook(automationConfig.webhookUrl, payload, {
          timeout: 10000,
          logger: req.log.child({
            contactId,
            automationConfigId: automationConfig.id,
            webhookType: automationConfig.name,
          }),
        }).catch((error) => {
          // Error ya manejado dentro de sendWebhook, solo prevenir unhandled rejection
          req.log.error(
            {
              contactId,
              webhookUrl: automationConfig.webhookUrl,
              automationConfigId: automationConfig.id,
              error: error instanceof Error ? error.message : String(error),
            },
            'Unhandled error in webhook send (should not happen)'
          );
        });
      } else {
        req.log.debug(
          {
            contactId,
            targetStageName: toStage.name,
            hasAutomationConfig: !!automationConfig,
          },
          'No automation config found or disabled for this stage change, skipping webhook'
        );
      }

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
