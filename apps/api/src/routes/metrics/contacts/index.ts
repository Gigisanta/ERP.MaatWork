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
} from '@cactus/db';
import { and, isNull, sql, desc, eq } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../../utils/validation';
import { createErrorResponse } from '../../../utils/error-response';
import { getPipelineStagesByNames } from './helpers';
import { calculateMonthlyMetrics } from './calculate-monthly';
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

      // Calculate current month metrics
      const currentMonthMetrics = await calculateMonthlyMetrics({
        month: targetMonth,
        year: targetYear,
        stageIds,
        accessFilter,
      });

      req.log.info(
        { month: targetMonth, year: targetYear, metrics: currentMonthMetrics },
        'Monthly metrics calculated successfully'
      );

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
      const allMonths = new Set<string>();
      for (const entry of allHistoryEntries) {
        allMonths.add(`${entry.year}-${entry.month}`);
      }
      for (const entry of contactCreationMonths) {
        allMonths.add(`${entry.year}-${entry.month}`);
      }

      // AI_DECISION: Excluir mes actual del historial para evitar cálculo duplicado.
      const currentMonthKey = `${targetYear}-${targetMonth}`;
      allMonths.delete(currentMonthKey);

      // Calculate metrics for each month in parallel (excluding current month)
      const monthPromises = Array.from(allMonths)
        .sort()
        .reverse()
        .map(async (monthKey) => {
          const [yearStr, monthStr] = monthKey.split('-');
          const histYear = Number(yearStr);
          const histMonth = Number(monthStr);
          if (histYear && histMonth) {
            return await calculateMonthlyMetrics({
              month: histMonth,
              year: histYear,
              stageIds,
              accessFilter,
            });
          }
          return null;
        });

      const historyMetrics = (await Promise.all(monthPromises)).filter(
        (m): m is Awaited<ReturnType<typeof calculateMonthlyMetrics>> => m !== null
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
