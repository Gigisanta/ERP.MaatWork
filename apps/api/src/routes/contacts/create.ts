/**
 * Contacts Create Route
 * 
 * POST /contacts - Create new contact
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, pipelineStageHistory, users } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { canAssignContactTo } from '../../auth/authorization';
import { createDrizzleLogger } from '../../utils/db-logger';
import { validate } from '../../utils/validation';
import { type Contact } from '../../types/contacts';
import { getProspectoStageId } from '../../utils/pipeline-stages';
import { contactsListCacheUtil } from '../../utils/cache';
import { createContactSchema } from './schemas';

const router = Router();

/**
 * POST /contacts - Create new contact
 */
router.post('/', 
  requireAuth,
  validate({ body: createContactSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  req.log.info({ 
    userId, 
    userRole, 
    action: 'create_contact',
    body: { ...req.body, password: '[REDACTED]' }
  }, 'Iniciando creación de contacto');

  try {
    const validated = req.body;

    // Auto-assign contacts to creator for ALL user roles
    let validatedAdvisorId = validated.assignedAdvisorId;
    let advisorWarning = null;
    
    req.log.info({
      userId,
      userRole,
      providedAdvisorId: validated.assignedAdvisorId,
      action: 'evaluating_advisor_assignment'
    }, 'Evaluating assignedAdvisorId assignment for contact creation');
    
    if (!validated.assignedAdvisorId) {
      validatedAdvisorId = userId;
      req.log.info({
        userId,
        userRole,
        autoAssignedAdvisorId: validatedAdvisorId,
        reason: 'no_assignment_provided_auto_assign_to_creator',
        action: 'auto_assignment'
      }, 'Auto-assigned contact to creator (no assignment provided)');
    } else {
      const canAssign = await canAssignContactTo(userId, userRole, validated.assignedAdvisorId);
    
      req.log.info({
        userId,
        userRole,
        providedAdvisorId: validated.assignedAdvisorId,
        canAssign,
        action: 'permission_check_result'
      }, 'Permission check for advisor assignment completed');
      
      if (!canAssign) {
        req.log.warn({ 
          providedAdvisorId: validated.assignedAdvisorId,
          userRole,
          userId,
          action: 'enforcing_auto_assignment_to_creator'
        }, 'user cannot assign contact to requested advisor, auto-assigning to creator');
      
        validatedAdvisorId = userId;
        advisorWarning = `No tiene permisos para asignar a ese asesor. El contacto se asignó automáticamente a usted.`;
        req.log.info({
          userId,
          userRole,
          autoAssignedAdvisorId: validatedAdvisorId,
          reason: 'permission_denied_auto_assign_to_creator',
          action: 'auto_assignment'
        }, 'Auto-assigned contact to creator (permission denied)');
      } else {
        const [advisor] = await db()
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, validated.assignedAdvisorId), eq(users.isActive, true)))
          .limit(1);
        
        if (!advisor) {
          req.log.warn({ 
            providedAdvisorId: validated.assignedAdvisorId,
            action: 'advisor_not_found_or_inactive'
          }, 'assigned advisor ID does not exist or is inactive, auto-assigning to creator');
          
          validatedAdvisorId = userId;
          advisorWarning = `El asesor asignado (${validated.assignedAdvisorId}) no existe o está inactivo. El contacto se asignó automáticamente a usted.`;
          req.log.info({
            userId,
            userRole,
            autoAssignedAdvisorId: validatedAdvisorId,
            reason: 'advisor_not_found_auto_assign_to_creator',
            action: 'auto_assignment'
          }, 'Auto-assigned contact to creator (advisor not found)');
        } else {
          req.log.info({
            userId,
            userRole,
            assignedAdvisorId: validatedAdvisorId,
            advisorId: advisor.id,
            action: 'advisor_validated'
          }, 'Advisor ID validated successfully');
        }
      }
    }
    
    req.log.info({
      userId,
      userRole,
      finalAssignedAdvisorId: validatedAdvisorId,
      providedAdvisorId: validated.assignedAdvisorId,
      action: 'final_assignment_decision'
    }, 'Final assignedAdvisorId decision before contact insertion');

    // Auto-assign pipeline stage
    let validatedPipelineStageId = validated.pipelineStageId;
    if (!validatedPipelineStageId) {
      try {
        validatedPipelineStageId = await getProspectoStageId();
        req.log.info({
          userId,
          userRole,
          autoAssignedStageId: validatedPipelineStageId,
          reason: 'no_stage_provided_auto_assign_prospecto',
          action: 'auto_assignment_stage'
        }, 'Auto-assigned contact to Prospecto stage (no stage provided)');
      } catch (error) {
        req.log.error({
          err: error,
          userId,
          userRole,
          action: 'failed_to_get_prospecto_stage'
        }, 'Failed to get Prospecto stage ID, creating contact without stage');
      }
    }

    const fullName = `${validated.firstName} ${validated.lastName}`;

    const dbLogger = createDrizzleLogger(req.log);
    const newContactResult = await dbLogger.insert(
      'create_contact_main',
      () => db()
        .insert(contacts)
        .values({
          ...validated,
          pipelineStageId: validatedPipelineStageId,
          assignedAdvisorId: validatedAdvisorId,
          fullName,
          customFields: validated.customFields || {}
        })
        .returning()
    );
    type NewContactResult = Contact;
    const [newContact] = newContactResult as NewContactResult[];

    // Verify assignedAdvisorId was saved correctly
    const savedAssignedAdvisorId = newContact.assignedAdvisorId;
    if (savedAssignedAdvisorId !== validatedAdvisorId) {
      req.log.error({
        contactId: newContact.id,
        expectedAssignedAdvisorId: validatedAdvisorId,
        actualAssignedAdvisorId: savedAssignedAdvisorId,
        userId,
        userRole,
        action: 'assigned_advisor_id_mismatch'
      }, 'CRITICAL: assignedAdvisorId mismatch detected after contact creation');
    } else {
      req.log.info({
        contactId: newContact.id,
        assignedAdvisorId: savedAssignedAdvisorId,
        userId,
        userRole,
        action: 'assigned_advisor_id_verified'
      }, 'assignedAdvisorId verified successfully after contact creation');
    }

    // Double-check in database
    const [verifiedContact] = await db()
      .select({ assignedAdvisorId: contacts.assignedAdvisorId })
      .from(contacts)
      .where(eq(contacts.id, newContact.id))
      .limit(1);
    
    if (verifiedContact) {
      if (verifiedContact.assignedAdvisorId !== validatedAdvisorId) {
        req.log.error({
          contactId: newContact.id,
          expectedAssignedAdvisorId: validatedAdvisorId,
          dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
          action: 'db_verification_failed'
        }, 'CRITICAL: Database verification failed - assignedAdvisorId mismatch');
      } else {
        req.log.info({
          contactId: newContact.id,
          dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
          action: 'db_verification_success'
        }, 'Database verification successful - assignedAdvisorId correctly persisted');
      }
    }

    // Register pipeline stage history
    if (validatedPipelineStageId && userId && userId !== '00000000-0000-0000-0000-000000000001') {
      try {
        await db()
          .insert(pipelineStageHistory)
          .values({
            contactId: newContact.id,
            fromStage: null,
            toStage: validatedPipelineStageId,
            reason: null,
            changedByUserId: userId
          });
        req.log.info({
          contactId: newContact.id,
          toStage: validatedPipelineStageId,
          userId
        }, 'pipeline stage history registered on contact creation');
      } catch (historyError) {
        req.log.error({
          err: historyError,
          contactId: newContact.id,
          toStage: validatedPipelineStageId
        }, 'failed to register pipeline stage history on contact creation (non-fatal)');
      }
    }

    if (validated.notes && validated.notes.trim()) {
      req.log.info({ 
        contactId: newContact.id, 
        noteCreated: true 
      }, 'contact created with note');
    }

    const result = newContact;
    const duration = Date.now() - startTime;
    
    req.log.info({ 
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
      stageAutoAssigned: !validated.pipelineStageId
    }, 'Creación de contacto exitosa');

    contactsListCacheUtil.clear();

    res.status(201).json({ 
      success: true,
      data: result,
      warning: advisorWarning 
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    req.log.error({ 
      err, 
      duration,
      userId,
      userRole,
      action: 'create_contact'
    }, 'Error en creación de contacto');
    next(err);
  }
});

export default router;


