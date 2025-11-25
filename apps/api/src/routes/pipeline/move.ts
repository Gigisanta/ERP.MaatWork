/**
 * Pipeline Move Routes
 * 
 * Handles moving contacts between pipeline stages
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, pipelineStages, contacts, pipelineStageHistory, automationConfigs } from '@cactus/db';
import { eq, and, isNull, count, sql } from 'drizzle-orm';
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
  reason: z.string().max(500).optional().nullable()
});

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /pipeline/move - Mover contacto entre etapas
 */
router.post('/move', 
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
      req.log.warn({ 
        contactId, 
        userId, 
        userRole 
      }, 'user attempted to move inaccessible contact in pipeline');
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
    const updated = await transactionWithLogging(
      req.log,
      'move-contact-pipeline',
      async (tx) => {
        // Verificar WIP limit dentro de la transacción (previene race condition)
        if (toStage.wipLimit !== null) {
          const [{ count: currentCount }] = await tx
            .select({ count: count() })
            .from(contacts)
            .where(and(
              eq(contacts.pipelineStageId, toStageId),
              isNull(contacts.deletedAt)
            ));

          if (Number(currentCount) >= toStage.wipLimit) {
            req.log.warn({ stageId: toStageId, wipLimit: toStage.wipLimit }, 'WIP limit would be exceeded');
            throw new Error('WIP limit exceeded');
          }
        }

        // Actualizar contacto dentro de la transacción
        const [updatedContact] = await tx
          .update(contacts)
          .set({
            pipelineStageId: toStageId,
            pipelineStageUpdatedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(contacts.id, contactId))
          .returning();

        if (!updatedContact) {
          throw new Error('Contact not found');
        }

        // Registrar en historial dentro de la transacción (solo si userId es válido)
        if (userId && userId !== '00000000-0000-0000-0000-000000000001') {
          await tx
            .insert(pipelineStageHistory)
            .values({
              contactId,
              fromStage: contact.pipelineStageId || null,
              toStage: toStageId,
              reason: reason || null,
              changedByUserId: userId
            });
        } else {
          req.log.info({ userId }, 'Skipping history entry for temp admin user');
        }

        return updatedContact;
      }
    );

    req.log.info({ contactId, fromStage: contact.pipelineStageId, toStage: toStageId }, 'contact moved in pipeline');
    
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
      
      req.log.info({
        contactId,
        contactFirstName: nombre,
        contactEmail: email,
        webhookUrl: automationConfig.webhookUrl,
        automationConfigId: automationConfig.id,
        stageName: toStage.name
      }, 'Contact moved to stage, triggering automation webhook');
      
      // Construir payload desde configuración o usar valores por defecto
      const payload = automationConfig.config && typeof automationConfig.config === 'object' && 'payload' in automationConfig.config
        ? { ...automationConfig.config.payload as Record<string, unknown>, nombre, email: email ?? null }
        : { nombre, email: email ?? null };
      
      // Enviar webhook de forma asíncrona (fire-and-forget)
      sendWebhook(
        automationConfig.webhookUrl,
        payload as { nombre: string; email: string | null },
        {
          timeout: 10000,
          logger: req.log.child({ 
            contactId,
            automationConfigId: automationConfig.id,
            webhookType: automationConfig.name
          })
        }
      ).catch((error) => {
        // Error ya manejado dentro de sendWebhook, solo prevenir unhandled rejection
        req.log.error({
          contactId,
          webhookUrl: automationConfig.webhookUrl,
          automationConfigId: automationConfig.id,
          error: error instanceof Error ? error.message : String(error)
        }, 'Unhandled error in webhook send (should not happen)');
      });
    } else {
      req.log.debug({
        contactId,
        targetStageName: toStage.name,
        hasAutomationConfig: !!automationConfig
      }, 'No automation config found or disabled for this stage change, skipping webhook');
    }
    
    res.json({ success: true, data: updated });
  } catch (err) {
    // Manejar errores específicos de WIP limit
    if (err instanceof Error && err.message === 'WIP limit exceeded') {
      return res.status(400).json({ 
        error: 'WIP limit exceeded',
        message: 'El límite de trabajo en progreso (WIP) para esta etapa ha sido alcanzado. Por favor, mueve contactos a otras etapas primero.'
      });
    }
    
    req.log.error({ err }, 'failed to move contact in pipeline');
    next(err);
  }
});

export default router;

