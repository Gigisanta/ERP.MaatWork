/**
 * Contact Utilities
 *
 * Shared utilities for contact operations
 */

import { db, users } from '@maatwork/db';
import { eq, and } from 'drizzle-orm';
import { canAssignContactTo } from '../../auth/authorization';
import { getProspectoStageId } from '../../utils/pipeline-stages';
import type { Request } from 'express';

/**
 * Result of advisor assignment validation
 */
interface AdvisorAssignmentResult {
  validatedAdvisorId: string;
  advisorWarning: string | null;
}

/**
 * Validates and resolves advisor assignment for contact creation
 *
 * AI_DECISION: Extract advisor assignment logic to separate function
 * Justificación: Complex business logic that can be reused and tested independently
 * Impacto: Improves readability of main handler, enables unit testing of assignment logic
 */
export async function validateAdvisorAssignment(
  userId: string,
  userRole: 'advisor' | 'manager' | 'admin' | 'owner' | 'staff',
  requestedAdvisorId: string | null | undefined,
  req: Request
): Promise<AdvisorAssignmentResult> {
  let validatedAdvisorId = requestedAdvisorId;
  let advisorWarning = null;

  req.log.info(
    {
      userId,
      userRole,
      providedAdvisorId: requestedAdvisorId,
      action: 'evaluating_advisor_assignment',
    },
    'Evaluating assignedAdvisorId assignment for contact creation'
  );

  if (!requestedAdvisorId) {
    validatedAdvisorId = userId;
    req.log.info(
      {
        userId,
        userRole,
        autoAssignedAdvisorId: validatedAdvisorId,
        reason: 'no_assignment_provided_auto_assign_to_creator',
        action: 'auto_assignment',
      },
      'Auto-assigned contact to creator (no assignment provided)'
    );
  } else {
    const canAssign = await canAssignContactTo(userId, userRole, requestedAdvisorId);

    req.log.info(
      {
        userId,
        userRole,
        providedAdvisorId: requestedAdvisorId,
        canAssign,
        action: 'permission_check_result',
      },
      'Permission check for advisor assignment completed'
    );

    if (!canAssign) {
      req.log.warn(
        {
          providedAdvisorId: requestedAdvisorId,
          userRole,
          userId,
          action: 'enforcing_auto_assignment_to_creator',
        },
        'user cannot assign contact to requested advisor, auto-assigning to creator'
      );

      validatedAdvisorId = userId;
      advisorWarning = `No tiene permisos para asignar a ese asesor. El contacto se asignó automáticamente a usted.`;
      req.log.info(
        {
          userId,
          userRole,
          autoAssignedAdvisorId: validatedAdvisorId,
          reason: 'permission_denied_auto_assign_to_creator',
          action: 'auto_assignment',
        },
        'Auto-assigned contact to creator (permission denied)'
      );
    } else {
      const [advisor] = await db()
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, requestedAdvisorId), eq(users.isActive, true)))
        .limit(1);

      if (!advisor) {
        req.log.warn(
          {
            providedAdvisorId: requestedAdvisorId,
            action: 'advisor_not_found_or_inactive',
          },
          'assigned advisor ID does not exist or is inactive, auto-assigning to creator'
        );

        validatedAdvisorId = userId;
        advisorWarning = `El asesor asignado (${requestedAdvisorId}) no existe o está inactivo. El contacto se asignó automáticamente a usted.`;
        req.log.info(
          {
            userId,
            userRole,
            autoAssignedAdvisorId: validatedAdvisorId,
            reason: 'advisor_not_found_auto_assign_to_creator',
            action: 'auto_assignment',
          },
          'Auto-assigned contact to creator (advisor not found)'
        );
      } else {
        req.log.info(
          {
            userId,
            userRole,
            assignedAdvisorId: validatedAdvisorId,
            advisorId: advisor.id,
            action: 'advisor_validated',
          },
          'Advisor ID validated successfully'
        );
      }
    }
  }

  return { validatedAdvisorId: validatedAdvisorId!, advisorWarning };
}

/**
 * Resolves pipeline stage assignment for contact creation
 *
 * AI_DECISION: Extract pipeline stage assignment to separate function
 * Justificación: Pipeline stage logic can be reused and tested independently
 * Impacto: Cleaner separation of concerns, easier testing
 */
export async function resolvePipelineStage(
  requestedPipelineStageId: string | null | undefined,
  userId: string,
  userRole: 'advisor' | 'manager' | 'admin' | 'owner' | 'staff',
  req: Request
): Promise<string | null | undefined> {
  let validatedPipelineStageId = requestedPipelineStageId;

  if (!requestedPipelineStageId) {
    try {
      validatedPipelineStageId = await getProspectoStageId();
      req.log.info(
        {
          userId,
          userRole,
          autoAssignedStageId: validatedPipelineStageId,
          reason: 'no_stage_provided_auto_assign_prospecto',
          action: 'auto_assignment_stage',
        },
        'Auto-assigned contact to Prospecto stage (no stage provided)'
      );
    } catch (error) {
      req.log.error(
        {
          err: error,
          userId,
          userRole,
          action: 'failed_to_get_prospecto_stage',
        },
        'Failed to get Prospecto stage ID, creating contact without stage'
      );
    }
  }

  return validatedPipelineStageId;
}
