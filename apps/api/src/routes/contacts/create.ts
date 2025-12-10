/**
 * Contacts Create Route
 *
 * POST /contacts - Create new contact
 */
import { Router, type Request, type Response } from 'express';
import { db, contacts, pipelineStageHistory } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireWriteAccess } from '../../auth/middlewares';
import { createDrizzleLogger } from '../../utils/database/db-logger';
import { validate } from '../../utils/validation';
import { type Contact } from '../../types/contacts';
import { contactsListCacheUtil } from '../../utils/performance/cache';
import { createContactSchema } from './schemas';
import { invalidateCache } from '../../middleware/cache';
import { createAsyncHandler } from '../../utils/route-handler';
import { validateAdvisorAssignment, resolvePipelineStage } from './utils';

const router = Router();

/**
 * POST /contacts - Create new contact
 */
// AI_DECISION: Usar createAsyncHandler para manejar respuesta con campo adicional 'warning'
// Justificación: createRouteHandler solo envuelve en { success: true, data: ... }, pero este endpoint
// necesita retornar { success: true, data: ..., warning?: string } cuando hay advertencias de asignación
// Impacto: Formato de respuesta consistente con otros endpoints pero con campo adicional opcional
router.post(
  '/',
  requireAuth,
  requireWriteAccess, // Bloquear Owner (solo lectura)
  validate({ body: createContactSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    req.log.info(
      {
        userId,
        userRole,
        action: 'create_contact',
        body: { ...req.body, password: '[REDACTED]' },
      },
      'Iniciando creación de contacto'
    );

    const validated = req.body;

    // Validate and resolve advisor assignment
    const { validatedAdvisorId, advisorWarning } = await validateAdvisorAssignment(
      userId,
      userRole,
      validated.assignedAdvisorId,
      req
    );

    req.log.info(
      {
        userId,
        userRole,
        finalAssignedAdvisorId: validatedAdvisorId,
        providedAdvisorId: validated.assignedAdvisorId,
        action: 'final_assignment_decision',
      },
      'Final assignedAdvisorId decision before contact insertion'
    );

    // Resolve pipeline stage assignment
    const validatedPipelineStageId = await resolvePipelineStage(
      validated.pipelineStageId,
      userId,
      userRole,
      req
    );

    const fullName = `${validated.firstName} ${validated.lastName}`;

    const dbLogger = createDrizzleLogger(req.log);
    const newContactResult = await dbLogger.insert('create_contact_main', () =>
      db()
        .insert(contacts)
        .values({
          ...validated,
          pipelineStageId: validatedPipelineStageId,
          assignedAdvisorId: validatedAdvisorId,
          fullName,
          customFields: validated.customFields || {},
        })
        .returning()
    );
    type NewContactResult = Contact;
    const [newContact] = newContactResult as NewContactResult[];

    // Verify assignedAdvisorId was saved correctly
    const savedAssignedAdvisorId = newContact.assignedAdvisorId;
    if (savedAssignedAdvisorId !== validatedAdvisorId) {
      req.log.error(
        {
          contactId: newContact.id,
          expectedAssignedAdvisorId: validatedAdvisorId,
          actualAssignedAdvisorId: savedAssignedAdvisorId,
          userId,
          userRole,
          action: 'assigned_advisor_id_mismatch',
        },
        'CRITICAL: assignedAdvisorId mismatch detected after contact creation'
      );
    } else {
      req.log.info(
        {
          contactId: newContact.id,
          assignedAdvisorId: savedAssignedAdvisorId,
          userId,
          userRole,
          action: 'assigned_advisor_id_verified',
        },
        'assignedAdvisorId verified successfully after contact creation'
      );
    }

    // Double-check in database
    const [verifiedContact] = await db()
      .select({ assignedAdvisorId: contacts.assignedAdvisorId })
      .from(contacts)
      .where(eq(contacts.id, newContact.id))
      .limit(1);

    if (verifiedContact) {
      if (verifiedContact.assignedAdvisorId !== validatedAdvisorId) {
        req.log.error(
          {
            contactId: newContact.id,
            expectedAssignedAdvisorId: validatedAdvisorId,
            dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
            action: 'db_verification_failed',
          },
          'CRITICAL: Database verification failed - assignedAdvisorId mismatch'
        );
      } else {
        req.log.info(
          {
            contactId: newContact.id,
            dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
            action: 'db_verification_success',
          },
          'Database verification successful - assignedAdvisorId correctly persisted'
        );
      }
    }

    // Register pipeline stage history
    if (validatedPipelineStageId && userId && userId !== '00000000-0000-0000-0000-000000000001') {
      try {
        await db().insert(pipelineStageHistory).values({
          contactId: newContact.id,
          fromStage: null,
          toStage: validatedPipelineStageId,
          reason: null,
          changedByUserId: userId,
        });
        req.log.info(
          {
            contactId: newContact.id,
            toStage: validatedPipelineStageId,
            userId,
          },
          'pipeline stage history registered on contact creation'
        );
      } catch (historyError) {
        req.log.error(
          {
            err: historyError,
            contactId: newContact.id,
            toStage: validatedPipelineStageId,
          },
          'failed to register pipeline stage history on contact creation (non-fatal)'
        );
      }
    }

    if (validated.notes && validated.notes.trim()) {
      req.log.info(
        {
          contactId: newContact.id,
          noteCreated: true,
        },
        'contact created with note'
      );
    }

    const result = newContact;
    const duration = Date.now() - startTime;

    req.log.info(
      {
        duration,
        contactId: newContact.id,
        userId,
        userRole,
        action: 'create_contact',
        hasNote: !!validated.notes?.trim(),
        expectedAssignedAdvisorId: validatedAdvisorId,
        savedAssignedAdvisorId: savedAssignedAdvisorId,
        dbVerifiedAssignedAdvisorId: verifiedContact?.assignedAdvisorId,
        advisorWarning: !!advisorWarning,
        assignmentVerified: savedAssignedAdvisorId === validatedAdvisorId,
        pipelineStageId: validatedPipelineStageId,
        providedPipelineStageId: validated.pipelineStageId,
        stageAutoAssigned: !validated.pipelineStageId,
      },
      'Creación de contacto exitosa'
    );

    // Invalidate caches
    contactsListCacheUtil.clear();
    // Invalidate Redis cache for contacts and pipeline
    await invalidateCache('crm:contacts:*');
    await invalidateCache('crm:pipeline:*');

    return res.status(201).json({
      success: true,
      data: result,
      warning: advisorWarning,
      requestId: req.requestId,
    });
  })
);

export default router;
