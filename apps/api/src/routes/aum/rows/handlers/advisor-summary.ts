/**
 * Handler para resumen de AUM por asesor
 *
 * AI_DECISION: Endpoint dedicado para agregación de datos financieros por asesor
 * Justificación: Permite visualizar totales de AUM por asesor con filtro mensual
 * Impacto: Habilita análisis de performance de asesores y seguimiento mensual de AUM
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import { sql, type SQL } from 'drizzle-orm';
import { parseNumeric } from '../utils';
import type {
  AumAdvisorSummaryQuery,
  AumAvailablePeriodsQuery,
} from '../../../../utils/aum/aum-validation';
import { createRouteHandler } from '@/utils/route-handler';

/**
 * Resultado de fila de resumen por asesor desde la base de datos
 */
interface AdvisorSummaryRow {
  advisor_id: string | null;
  advisor_name: string | null;
  advisor_email: string | null;
  is_matched: boolean;
  client_count: number;
  aum_dollars: string | null;
  bolsa_arg: string | null;
  fondos_arg: string | null;
  bolsa_bci: string | null;
  pesos: string | null;
  mep: string | null;
  cable: string | null;
  cv7000: string | null;
}

/**
 * Resultado de período disponible desde la base de datos
 */
interface AvailablePeriodRow {
  report_month: number;
  report_year: number;
  file_count: number;
}

/**
 * GET /admin/aum/rows/advisor-summary
 * Get AUM summary aggregated by advisor with monthly filter
 *
 * Query params están validados por middleware validate() con aumAdvisorSummaryQuerySchema
 */
export const getAdvisorSummary = createRouteHandler(async (req: Request) => {
  // req.query ya está validado y tipado por el middleware validate()
  const query = req.query as unknown as AumAdvisorSummaryQuery;
  const reportMonth = query.reportMonth;
  const reportYear = query.reportYear;
  const broker = query.broker;

  req.log?.info?.(
    {
      reportMonth,
      reportYear,
      broker,
    },
    'AUM advisor summary GET: Parámetros de query recibidos'
  );

  const dbi = db();

  // Build WHERE conditions
  const conditions: SQL[] = [];

  // Solo filas preferidas para evitar duplicados
  conditions.push(sql`r.is_preferred = true`);

  if (broker) {
    conditions.push(sql`f.broker = ${broker}`);
  }

  if (reportMonth !== undefined) {
    conditions.push(sql`f.report_month = ${reportMonth}`);
  }

  if (reportYear !== undefined) {
    conditions.push(sql`f.report_year = ${reportYear}`);
  }

  const whereClause =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  // Query para agregar datos por asesor
  // AI_DECISION: Agrupar por advisor_raw del archivo de importación
  // Justificación: Muestra TODOS los asesores del archivo, estén o no matcheados con usuarios de la app
  // Impacto: Visibilidad completa de asesores incluyendo aquellos sin cuenta en el sistema
  const summaryResult = await dbi.execute(sql`
      SELECT 
        r.matched_user_id::text as advisor_id,
        COALESCE(u.full_name, NULLIF(TRIM(r.advisor_raw), ''), 'Sin asignar') as advisor_name,
        CASE WHEN r.matched_user_id IS NOT NULL THEN u.email ELSE NULL END as advisor_email,
        CASE WHEN r.matched_user_id IS NOT NULL THEN true ELSE false END as is_matched,
        COUNT(DISTINCT r.id)::int as client_count,
        COALESCE(SUM(CAST(r.aum_dollars AS DECIMAL(18,6))), 0)::text as aum_dollars,
        COALESCE(SUM(CAST(r.bolsa_arg AS DECIMAL(18,6))), 0)::text as bolsa_arg,
        COALESCE(SUM(CAST(r.fondos_arg AS DECIMAL(18,6))), 0)::text as fondos_arg,
        COALESCE(SUM(CAST(r.bolsa_bci AS DECIMAL(18,6))), 0)::text as bolsa_bci,
        COALESCE(SUM(CAST(r.pesos AS DECIMAL(18,6))), 0)::text as pesos,
        COALESCE(SUM(CAST(r.mep AS DECIMAL(18,6))), 0)::text as mep,
        COALESCE(SUM(CAST(r.cable AS DECIMAL(18,6))), 0)::text as cable,
        COALESCE(SUM(CAST(r.cv7000 AS DECIMAL(18,6))), 0)::text as cv7000
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      LEFT JOIN users u ON r.matched_user_id = u.id
      ${whereClause}
      GROUP BY 
        r.matched_user_id,
        COALESCE(u.full_name, NULLIF(TRIM(r.advisor_raw), ''), 'Sin asignar'),
        CASE WHEN r.matched_user_id IS NOT NULL THEN u.email ELSE NULL END,
        CASE WHEN r.matched_user_id IS NOT NULL THEN true ELSE false END
      ORDER BY 
        CASE WHEN COALESCE(u.full_name, NULLIF(TRIM(r.advisor_raw), ''), 'Sin asignar') = 'Sin asignar' THEN 1 ELSE 0 END,
        COALESCE(SUM(CAST(r.aum_dollars AS DECIMAL(18,6))), 0) DESC
    `);

  // Mapear resultados
  const advisorSummary = ((summaryResult.rows || []) as AdvisorSummaryRow[]).map((row) => ({
    advisorId: row.advisor_id,
    advisorName: row.advisor_name,
    advisorEmail: row.advisor_email,
    isMatched: row.is_matched,
    clientCount: Number(row.client_count),
    aumDollars: parseNumeric(row.aum_dollars),
    bolsaArg: parseNumeric(row.bolsa_arg),
    fondosArg: parseNumeric(row.fondos_arg),
    bolsaBci: parseNumeric(row.bolsa_bci),
    pesos: parseNumeric(row.pesos),
    mep: parseNumeric(row.mep),
    cable: parseNumeric(row.cable),
    cv7000: parseNumeric(row.cv7000),
  }));

  // Calcular totales generales
  const totals = advisorSummary.reduce(
    (acc, row) => ({
      clientCount: acc.clientCount + row.clientCount,
      aumDollars: acc.aumDollars + (row.aumDollars || 0),
      bolsaArg: acc.bolsaArg + (row.bolsaArg || 0),
      fondosArg: acc.fondosArg + (row.fondosArg || 0),
      bolsaBci: acc.bolsaBci + (row.bolsaBci || 0),
      pesos: acc.pesos + (row.pesos || 0),
      mep: acc.mep + (row.mep || 0),
      cable: acc.cable + (row.cable || 0),
      cv7000: acc.cv7000 + (row.cv7000 || 0),
    }),
    {
      clientCount: 0,
      aumDollars: 0,
      bolsaArg: 0,
      fondosArg: 0,
      bolsaBci: 0,
      pesos: 0,
      mep: 0,
      cable: 0,
      cv7000: 0,
    }
  );

  req.log?.info?.(
    {
      reportMonth,
      reportYear,
      advisorCount: advisorSummary.length,
      totalClients: totals.clientCount,
      totalAumDollars: totals.aumDollars,
    },
    'AUM advisor summary GET: Resumen obtenido'
  );

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, summary, totals, filters } para compatibilidad con frontend
  return {
    ok: true,
    summary: advisorSummary,
    totals,
    filters: {
      reportMonth: reportMonth ?? null,
      reportYear: reportYear ?? null,
      broker: broker ?? null,
    },
  };
});

/**
 * GET /admin/aum/rows/available-periods
 * Get list of available report periods (month/year combinations)
 *
 * Query params están validados por middleware validate() con aumAvailablePeriodsQuerySchema
 */
export const getAvailablePeriods = createRouteHandler(async (req: Request) => {
  // req.query ya está validado y tipado por el middleware validate()
  const query = req.query as unknown as AumAvailablePeriodsQuery;
  const broker = query.broker;

  const dbi = db();

  // Build WHERE conditions
  const conditions: SQL[] = [];

  // Solo archivos mensuales con período definido
  conditions.push(sql`f.report_month IS NOT NULL`);
  conditions.push(sql`f.report_year IS NOT NULL`);

  if (broker) {
    conditions.push(sql`f.broker = ${broker}`);
  }

  const whereClause =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  // Query para obtener períodos disponibles
  const periodsResult = await dbi.execute(sql`
      SELECT 
        f.report_month,
        f.report_year,
        COUNT(*)::int as file_count
      FROM aum_import_files f
      ${whereClause}
      GROUP BY f.report_month, f.report_year
      ORDER BY f.report_year DESC, f.report_month DESC
    `);

  const periods = ((periodsResult.rows || []) as AvailablePeriodRow[]).map((row) => ({
    month: row.report_month,
    year: row.report_year,
    fileCount: row.file_count,
    label: `${getMonthName(row.report_month)} ${row.report_year}`,
  }));

  req.log?.info?.(
    {
      periodsCount: periods.length,
      broker,
    },
    'AUM available periods GET: Períodos obtenidos'
  );

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, periods } para compatibilidad con frontend
  return {
    ok: true,
    periods,
  };
});

/**
 * Helper para obtener nombre del mes en español
 */
function getMonthName(month: number): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return months[month - 1] || `Mes ${month}`;
}
