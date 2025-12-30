/**
 * Contact Metrics Routes
 *
 * Modular structure for pipeline contact metrics calculations:
 * - types.ts - Shared types
 * - helpers.ts - Helper functions (getFirstTimeStageEntries, etc.)
 * - calculators/ - Individual metric calculators
 * - calculate-monthly.ts - Monthly metrics orchestrator
 * - index.ts - Router with endpoints
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  db,
  contacts,
  pipelineStageHistory,
  contactStageInteractions,
  pipelineStages,
} from '@maatwork/db';
import { and, isNull, sql, desc, eq } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../../utils/validation';
import { createErrorResponse } from '../../../utils/error-response';
import { getPipelineStagesByNames } from './helpers';
import { calculateMonthlyMetrics } from './calculate-monthly';
import { calculateBatchMonthlyMetrics } from './calculate-batch';
import type { PipelineStageIds } from './types';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const metricsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(12))
    .optional(),
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000)).optional(),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /metrics/contacts - Get pipeline metrics
 */
router.get(
  '/contacts',
  requireAuth,
  validate({ query: metricsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, year } = req.query;

      // Get user access scope for data isolation
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);

      // AI_DECISION: Optimizar queries de pipeline stages - batch query en lugar de 5 queries secuenciales
      // Justificación: Reduce de 5 queries a 1 query (80% reducción), mejora latencia del endpoint
      // Impacto: Mejora significativa en performance del endpoint de métricas
      const stageNames = [
        'Contactado',
        'Prospecto',
        'Primera reunion',
        'Segunda reunion',
        'Cliente',
      ];
      const stagesByName = await getPipelineStagesByNames(stageNames);

      const contactadoStage = stagesByName.get('Contactado');
      const prospectoStage = stagesByName.get('Prospecto');
      const firstMeetingStage = stagesByName.get('Primera reunion');
      const secondMeetingStage = stagesByName.get('Segunda reunion');
      const clienteStage = stagesByName.get('Cliente');

      if (!contactadoStage || !firstMeetingStage || !secondMeetingStage || !clienteStage) {
        req.log.error(
          {
            contactadoStage: !!contactadoStage,
            firstMeetingStage: !!firstMeetingStage,
            secondMeetingStage: !!secondMeetingStage,
            clienteStage: !!clienteStage,
          },
          'Required pipeline stages not found'
        );
        return res.status(500).json(
          createErrorResponse({
            error: new Error('Pipeline stages not found'),
            requestId: req.requestId,
            userMessage: 'Etapas de pipeline requeridas no encontradas',
          })
        );
      }

      const stageIds: PipelineStageIds = {
        contactadoStageId: contactadoStage.id,
        prospectoStageId: prospectoStage?.id,
        firstMeetingStageId: firstMeetingStage.id,
        secondMeetingStageId: secondMeetingStage.id,
        clienteStageId: clienteStage.id,
      };

      req.log.debug(
        {
          contactadoStageId: stageIds.contactadoStageId,
          prospectoStageId: stageIds.prospectoStageId,
          firstMeetingStageId: stageIds.firstMeetingStageId,
          secondMeetingStageId: stageIds.secondMeetingStageId,
          clienteStageId: stageIds.clienteStageId,
        },
        'Pipeline stages loaded'
      );

      // Use current month/year if not specified
      const now = new Date();
      const targetMonth = month ? Number(month) : now.getMonth() + 1;
      const targetYear = year ? Number(year) : now.getFullYear();

      // Calculate history: all months with available data
      const allHistoryEntries = await db()
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})::int`,
          year: sql<number>`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})::int`,
        })
        .from(pipelineStageHistory)
        .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
        .where(and(isNull(contacts.deletedAt), accessFilter.whereClause))
        .groupBy(
          sql`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})`,
          sql`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})`
        )
        .orderBy(
          desc(sql`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})`),
          desc(sql`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})`)
        );

      // Also include months with created contacts
      const contactCreationMonths = await db()
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${contacts.createdAt})::int`,
          year: sql<number>`EXTRACT(YEAR FROM ${contacts.createdAt})::int`,
        })
        .from(contacts)
        .where(and(isNull(contacts.deletedAt), accessFilter.whereClause))
        .groupBy(
          sql`EXTRACT(MONTH FROM ${contacts.createdAt})`,
          sql`EXTRACT(YEAR FROM ${contacts.createdAt})`
        );

      // Combine and deduplicate months
      const allMonthsSet = new Set<string>();
      for (const entry of allHistoryEntries) {
        allMonthsSet.add(`${entry.year}-${entry.month}`);
      }
      for (const entry of contactCreationMonths) {
        allMonthsSet.add(`${entry.year}-${entry.month}`);
      }

      // Ensure target month is included
      allMonthsSet.add(`${targetYear}-${targetMonth}`);

      // AI_DECISION: Batch calculation of all monthly metrics
      // Justificación: Replaces N * 12 queries with ~3 queries total for all history
      // Impacto: Reducción drástica de latencia en dashboard de métricas (especialmente con mucho historial)
      const monthsToCalculate = Array.from(allMonthsSet).map((m) => {
        const [y, mon] = m.split('-');
        return { year: Number(y), month: Number(mon) };
      });

      const allMetrics = await calculateBatchMonthlyMetrics({
        months: monthsToCalculate,
        stageIds,
        accessFilter,
      });

      // Split into current month and history
      const currentMonthMetrics = allMetrics.find(
        (m) => m.month === targetMonth && m.year === targetYear
      )!;
      const historyMetrics = allMetrics
        .filter((m) => !(m.month === targetMonth && m.year === targetYear))
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

      req.log.info(
        { month: targetMonth, year: targetYear, historyCount: historyMetrics.length },
        'All metrics calculated successfully via batch process'
      );

      // Calculate average interactions per stage
      // AI_DECISION: Calcular promedio de interacciones por etapa
      // Justificación: Métrica útil para entender engagement promedio por etapa del pipeline
      // Impacto: Permite identificar etapas con bajo engagement
      req.log.debug({ userId, userRole }, 'Calculating average interactions per stage');
      const averageInteractionsRaw = await db()
        .select({
          stageId: contactStageInteractions.pipelineStageId,
          stageName: pipelineStages.name,
          averageInteractions: sql<number>`COALESCE(AVG(${contactStageInteractions.interactionCount})::numeric, 0)`,
        })
        .from(contactStageInteractions)
        .innerJoin(pipelineStages, eq(contactStageInteractions.pipelineStageId, pipelineStages.id))
        .innerJoin(contacts, eq(contactStageInteractions.contactId, contacts.id))
        .where(and(isNull(contacts.deletedAt), accessFilter.whereClause))
        .groupBy(contactStageInteractions.pipelineStageId, pipelineStages.name);

      // Transform to ensure numeric values
      const averageInteractions = averageInteractionsRaw.map(
        (item: { stageId: string | null; stageName: string; averageInteractions: number }) => ({
          stageId: item.stageId || '',
          stageName: item.stageName,
          averageInteractions: Number(item.averageInteractions) || 0,
        })
      );

      req.log.info(
        {
          userId,
          userRole,
          averageInteractionsCount: averageInteractions.length,
          month: targetMonth,
          year: targetYear,
        },
        'Metrics calculated successfully including average interactions'
      );

      res.json({
        success: true,
        data: {
          currentMonth: currentMonthMetrics,
          history: historyMetrics,
          averageInteractions,
        },
      });
    } catch (err) {
      req.log.error({ err }, 'failed to get contacts metrics');
      next(err);
    }
  }
);

export default router;
