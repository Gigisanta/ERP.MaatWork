/**
 * Handlers para Portfolio Assignments
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import {
  portfolioTemplates,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  portfolioTemplateLines,
  instruments,
  lookupAssetClass,
} from '@cactus/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { createDrizzleLogger, createOperationName } from '../../../utils/db-logger';
import { UserRole } from '../../../auth/types';
import { HttpError } from '../../../utils/route-handler';
import { getAssignmentWithAccessCheck } from '../../../services/portfolio-service';

/**
 * GET /portfolios/assignments
 * Listar asignaciones de carteras por contacto
 */
export async function listAssignments(req: Request) {
  const contactId = req.contactId || (req.query.contactId as string);
  const dbLogger = createDrizzleLogger(req.log);

  const assignmentsOperationName = createOperationName('get_portfolio_assignments', contactId);
  const assignments = await dbLogger.select(assignmentsOperationName, () =>
    db()
      .select({
        id: clientPortfolioAssignments.id,
        contactId: clientPortfolioAssignments.contactId,
        templateId: clientPortfolioAssignments.templateId,
        templateName: portfolioTemplates.name,
        status: clientPortfolioAssignments.status,
        startDate: clientPortfolioAssignments.startDate,
        endDate: clientPortfolioAssignments.endDate,
        notes: clientPortfolioAssignments.notes,
        createdAt: clientPortfolioAssignments.createdAt,
      })
      .from(clientPortfolioAssignments)
      .leftJoin(
        portfolioTemplates,
        eq(clientPortfolioAssignments.templateId, portfolioTemplates.id)
      )
      .where(eq(clientPortfolioAssignments.contactId, contactId))
      .orderBy(desc(clientPortfolioAssignments.createdAt))
  );

  return assignments;
}

/**
 * POST /portfolios/assignments
 * Asignar cartera a contacto
 */
export async function createAssignment(req: Request) {
  const userId = req.user?.id!;
  const { contactId, templateId, startDate, notes } = req.body;

  // Verificar que la plantilla existe
  const template = await db()
    .select({ id: portfolioTemplates.id })
    .from(portfolioTemplates)
    .where(eq(portfolioTemplates.id, templateId))
    .limit(1);

  if (template.length === 0) {
    throw new HttpError(404, 'Plantilla no encontrada');
  }

  // Desactivar asignaciones previas del contacto
  await db()
    .update(clientPortfolioAssignments)
    .set({ status: 'ended' })
    .where(
      and(
        eq(clientPortfolioAssignments.contactId, contactId),
        eq(clientPortfolioAssignments.status, 'active')
      )
    );

  // Crear nueva asignación
  const [assignment] = await db()
    .insert(clientPortfolioAssignments)
    .values({
      contactId,
      templateId,
      status: 'active',
      startDate,
      notes,
      createdByUserId: userId,
    })
    .returning();

  return assignment;
}

/**
 * GET /contacts/:id/portfolio
 * Obtener cartera activa de un contacto
 */
export async function getContactPortfolio(req: Request) {
  const contactId = req.params.id;
  const dbLogger = createDrizzleLogger(req.log);

  const operationName = createOperationName('get_contact_portfolio', contactId);

  type PortfolioResult = {
    rows: Array<{
      assignment: {
        id: string;
        templateId: string;
        status: string;
        startDate: string;
        endDate: string | null;
        notes: string | null;
        templateName: string;
        templateDescription: string | null;
        riskLevel: string;
      };
      template_lines: unknown;
      overrides: unknown;
    }>;
  };

  const result = (await dbLogger.select(operationName, () =>
    db().execute(sql`
        WITH assignment_data AS (
          SELECT 
            cpa.id,
            cpa.template_id,
            cpa.status,
            cpa.start_date,
            cpa.end_date,
            cpa.notes,
            pt.name AS template_name,
            pt.description AS template_description,
            pt.risk_level
          FROM ${clientPortfolioAssignments} cpa
          INNER JOIN ${portfolioTemplates} pt ON cpa.template_id = pt.id
          WHERE cpa.contact_id = ${contactId}
            AND cpa.status = 'active'
          LIMIT 1
        ),
        template_lines_data AS (
          SELECT 
            ptl.template_id,
            json_agg(
              json_build_object(
                'id', ptl.id,
                'targetType', ptl.target_type,
                'assetClass', ptl.asset_class,
                'instrumentId', ptl.instrument_id,
                'targetWeight', ptl.target_weight::text,
                'instrumentName', i.name,
                'instrumentSymbol', i.symbol,
                'assetClassName', lac.label
              )
              ORDER BY ptl.target_type, ptl.target_weight
            ) AS lines
          FROM ${portfolioTemplateLines} ptl
          LEFT JOIN ${instruments} i ON ptl.instrument_id = i.id
          LEFT JOIN ${lookupAssetClass} lac ON ptl.asset_class = lac.id
          WHERE ptl.template_id IN (SELECT template_id FROM assignment_data)
          GROUP BY ptl.template_id
        ),
        overrides_data AS (
          SELECT 
            cpo.assignment_id,
            json_agg(
              json_build_object(
                'id', cpo.id,
                'targetType', cpo.target_type,
                'assetClass', cpo.asset_class,
                'instrumentId', cpo.instrument_id,
                'targetWeight', cpo.target_weight::text
              )
            ) AS overrides
          FROM ${clientPortfolioOverrides} cpo
          WHERE cpo.assignment_id IN (SELECT id FROM assignment_data)
          GROUP BY cpo.assignment_id
        )
        SELECT 
          json_build_object(
            'id', ad.id,
            'templateId', ad.template_id,
            'status', ad.status,
            'startDate', ad.start_date,
            'endDate', ad.end_date,
            'notes', ad.notes,
            'templateName', ad.template_name,
            'templateDescription', ad.template_description,
            'riskLevel', ad.risk_level
          ) AS assignment,
          COALESCE(tld.lines, '[]'::json) AS template_lines,
          COALESCE(od.overrides, '[]'::json) AS overrides
        FROM assignment_data ad
        LEFT JOIN template_lines_data tld ON ad.template_id = tld.template_id
        LEFT JOIN overrides_data od ON ad.id = od.assignment_id
      `)
  )) as PortfolioResult;

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    assignment: {
      id: string;
      templateId: string;
      status: string;
      startDate: string;
      endDate: string | null;
      notes: string | null;
      templateName: string;
      templateDescription: string | null;
      riskLevel: string | null;
    };
    template_lines: Array<{
      id: string;
      targetType: string;
      assetClass: string | null;
      instrumentId: string | null;
      targetWeight: string;
      instrumentName: string | null;
      instrumentSymbol: string | null;
      assetClassName: string | null;
    }>;
    overrides: Array<{
      id: string;
      targetType: string;
      assetClass: string | null;
      instrumentId: string | null;
      targetWeight: string;
    }>;
  };

  return {
    assignment: row.assignment,
    templateLines: row.template_lines || [],
    overrides: row.overrides || [],
  };
}

/**
 * PUT /portfolios/assignments/:id/overrides
 * Actualizar overrides de asignación
 */
export async function updateAssignmentOverrides(req: Request) {
  const userId = req.user?.id!;
  const role = req.user?.role as UserRole;
  const assignmentId = req.params.id;

  const { overrides } = req.body;

  if (!Array.isArray(overrides)) {
    throw new HttpError(400, 'Overrides debe ser un array');
  }

  const assignment = await getAssignmentWithAccessCheck(assignmentId, userId, role);

  if (!assignment) {
    throw new HttpError(404, 'Asignación no encontrada o sin acceso');
  }

  await db().transaction(async (tx: ReturnType<typeof db>) => {
    await tx
      .delete(clientPortfolioOverrides)
      .where(eq(clientPortfolioOverrides.assignmentId, assignmentId));

    if (overrides.length > 0) {
      await tx.insert(clientPortfolioOverrides).values(
        overrides.map(
          (override: {
            targetType: string;
            assetClass?: string;
            instrumentId?: string;
            targetWeight: number;
          }) => ({
            assignmentId,
            targetType: override.targetType,
            assetClass: override.assetClass,
            instrumentId: override.instrumentId,
            targetWeight: override.targetWeight,
          })
        )
      );
    }
  });

  return { message: 'Overrides actualizados correctamente' };
}

/**
 * PATCH /portfolios/assignments/:id
 * Actualizar estado de asignación de portfolio
 */
export async function updateAssignmentStatus(req: Request) {
  const userId = req.user?.id!;
  const role = req.user?.role as UserRole;
  const assignmentId = req.params.id;
  const { status } = req.body;

  const assignment = await getAssignmentWithAccessCheck(assignmentId, userId, role);

  if (!assignment) {
    throw new HttpError(404, 'Asignación no encontrada o sin acceso');
  }

  const [updated] = await db()
    .update(clientPortfolioAssignments)
    .set({
      status,
      ...(status === 'ended' ? { endDate: new Date() } : {}),
    })
    .where(eq(clientPortfolioAssignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * DELETE /portfolios/assignments/:id
 * Eliminar asignación de portfolio (soft delete marcando como ended)
 */
export async function deleteAssignment(req: Request) {
  const userId = req.user?.id!;
  const role = req.user?.role as UserRole;
  const assignmentId = req.params.id;

  const assignment = await getAssignmentWithAccessCheck(assignmentId, userId, role);

  if (!assignment) {
    throw new HttpError(404, 'Asignación no encontrada o sin acceso');
  }

  await db()
    .update(clientPortfolioAssignments)
    .set({
      status: 'ended',
      endDate: new Date(),
    })
    .where(eq(clientPortfolioAssignments.id, assignmentId));

  return { message: 'Asignación eliminada correctamente' };
}
