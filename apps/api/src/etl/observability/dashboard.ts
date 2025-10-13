/**
 * Dashboard de observabilidad para ETL - métricas y alertas según SLO
 * Implementa métricas p95, matched rate, DLQ, DQ
 */

import { db, integrationRuns, stgClusterCuentas, stgComisiones } from '@cactus/db';
import { sql, gte, lte, and, eq } from 'drizzle-orm';
import { getMatchingMetrics } from '../matching/matcher';

/**
 * SLO definidos en superprompt
 */
export const SLO = {
  p95_vistas_criticas_ms: 1000, // < 1s
  p95_integraciones_ms: 3000, // < 3s
  exito_ingestion_pct: 99.5, // > 99.5%
  matched_rate_pct: 95.0, // ≥ 95%
  dlq_count: 0, // = 0 en producción
  dq_nulls_max: 10, // Threshold arbitrario para demo
  dq_dupes_max: 5
};

/**
 * Estructura de métrica agregada
 */
export interface Metric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: Date;
}

/**
 * Estructura de alerta
 */
export interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

/**
 * Dashboard completo con métricas y alertas
 */
export interface Dashboard {
  metrics: {
    latency: Metric[];
    quality: Metric[];
    matching: Metric[];
    volume: Metric[];
  };
  alerts: Alert[];
  summary: {
    totalMetrics: number;
    criticalAlerts: number;
    warningAlerts: number;
    overallStatus: 'healthy' | 'degraded' | 'critical';
  };
}

/**
 * Calcula métricas de latencia (p95 simulado)
 * En producción, esto se mediría desde Prometheus/OTEL
 * 
 * @param from - Fecha inicio
 * @param to - Fecha fin
 * @returns Métricas de latencia
 */
export async function getLatencyMetrics(from?: string, to?: string): Promise<Metric[]> {
  // Simulación: en producción se consultaría histograma de métricas
  // Por ahora, calculamos p95 desde integration_runs (processing_time_ms)
  
  let whereConditions = [];
  if (from) {
    whereConditions.push(gte(integrationRuns.startedAt, new Date(from)));
  }
  if (to) {
    whereConditions.push(lte(integrationRuns.startedAt, new Date(to)));
  }
  
  const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  
  // Query simplificada: AVG como proxy de p95 (idealmente percentile_cont)
  const [result] = await db()
    .select({
      avgMs: sql<number>`AVG(EXTRACT(EPOCH FROM (${integrationRuns.finishedAt} - ${integrationRuns.startedAt})) * 1000)::int`
    })
    .from(integrationRuns)
    .where(where);
  
  const avgMs = result?.avgMs || 0;
  const p95Ms = avgMs * 1.2; // Aproximación: p95 ≈ avg * 1.2
  
  return [
    {
      name: 'etl_p95_ms',
      value: p95Ms,
      unit: 'ms',
      threshold: SLO.p95_integraciones_ms,
      status: p95Ms < SLO.p95_integraciones_ms ? 'ok' : 'critical',
      timestamp: new Date()
    }
  ];
}

/**
 * Calcula métricas de calidad de datos (DQ)
 * 
 * @returns Métricas de calidad
 */
export async function getDataQualityMetrics(): Promise<Metric[]> {
  // Count de nulos en campos críticos (ejemplo: comitente, cuotapartista)
  // TODO: Implementar cuando stgAumMadre esté disponible
  // const [nullsMadre] = await db()
  //   .select({
  //     count: sql<number>`COUNT(*)::int`
  //   })
  //   .from(stgAumMadre)
  //   .where(
  //     sql`${stgAumMadre.comitente} IS NULL OR ${stgAumMadre.cuotapartista} IS NULL`
  //   );
  
  const nullsMadre = { count: 0 }; // Placeholder
  
  const [nullsMensual] = await db()
    .select({
      count: sql<number>`COUNT(*)::int`
    })
    .from(stgClusterCuentas)
    .where(
      sql`${stgClusterCuentas.comitente} IS NULL OR ${stgClusterCuentas.cuotapartista} IS NULL`
    );
  
  const [nullsComisiones] = await db()
    .select({
      count: sql<number>`COUNT(*)::int`
    })
    .from(stgComisiones)
    .where(
      sql`${stgComisiones.comitente} IS NULL OR ${stgComisiones.cuotapartista} IS NULL`
    );
  
  const totalNulls = (nullsMadre?.count || 0) + (nullsMensual?.count || 0) + (nullsComisiones?.count || 0);
  
  // Count de duplicados (ejemplo: misma combinación comitente+cuotapartista+fecha)
  // Simplificado: duplicados en stg_cluster_cuentas
  const [dupes] = await db()
    .select({
      count: sql<number>`COUNT(*) - COUNT(DISTINCT (${stgClusterCuentas.comitente}, ${stgClusterCuentas.cuotapartista}))::int`
    })
    .from(stgClusterCuentas);
  
  const totalDupes = dupes?.count || 0;
  
  return [
    {
      name: 'dq_nulls',
      value: totalNulls,
      unit: 'rows',
      threshold: SLO.dq_nulls_max,
      status: totalNulls <= SLO.dq_nulls_max ? 'ok' : 'warning',
      timestamp: new Date()
    },
    {
      name: 'dq_dupes',
      value: totalDupes,
      unit: 'rows',
      threshold: SLO.dq_dupes_max,
      status: totalDupes <= SLO.dq_dupes_max ? 'ok' : 'warning',
      timestamp: new Date()
    }
  ];
}

/**
 * Calcula métricas de matching
 * 
 * @returns Métricas de matching
 */
export async function getMatchingMetricsForDashboard(): Promise<Metric[]> {
  const matchingStats = await getMatchingMetrics();
  
  const matchRate = matchingStats.matchRate;
  
  return [
    {
      name: 'matched_rate',
      value: matchRate,
      unit: '%',
      threshold: SLO.matched_rate_pct,
      status: matchRate >= SLO.matched_rate_pct ? 'ok' : 'critical',
      timestamp: new Date()
    },
    {
      name: 'multi_match_count',
      value: matchingStats.multiMatch,
      unit: 'records',
      status: 'ok',
      timestamp: new Date()
    },
    {
      name: 'no_match_count',
      value: matchingStats.noMatch,
      unit: 'records',
      status: 'ok',
      timestamp: new Date()
    },
    {
      name: 'mismatch_owner_benef_count',
      value: matchingStats.mismatchOwnerBenef,
      unit: 'records',
      status: matchingStats.mismatchOwnerBenef > 0 ? 'warning' : 'ok',
      timestamp: new Date()
    }
  ];
}

/**
 * Calcula métricas de volumen (rows por fuente)
 * 
 * @returns Métricas de volumen
 */
export async function getVolumeMetrics(): Promise<Metric[]> {
  // TODO: Implementar cuando stgAumMadre esté disponible
  // const [madreRows] = await db()
  //   .select({ count: sql<number>`COUNT(*)::int` })
  //   .from(stgAumMadre);
  
  const madreRows = { count: 0 }; // Placeholder
  
  const [mensualRows] = await db()
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(stgClusterCuentas);
  
  const [comisionesRows] = await db()
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(stgComisiones);
  
  return [
    {
      name: 'rows_stg_aum_madre',
      value: madreRows?.count || 0,
      unit: 'rows',
      status: 'ok',
      timestamp: new Date()
    },
    {
      name: 'rows_stg_cluster_cuentas',
      value: mensualRows?.count || 0,
      unit: 'rows',
      status: 'ok',
      timestamp: new Date()
    },
    {
      name: 'rows_stg_comisiones',
      value: comisionesRows?.count || 0,
      unit: 'rows',
      status: 'ok',
      timestamp: new Date()
    }
  ];
}

/**
 * Calcula DLQ (Dead Letter Queue) events
 * En este diseño, DLQ = integration_runs con status='failed'
 * 
 * @returns Count de DLQ events
 */
export async function getDLQCount(): Promise<number> {
  const [result] = await db()
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(integrationRuns)
    .where(eq(integrationRuns.status, 'failed'));
  
  return result?.count || 0;
}

/**
 * Verifica alertas activas según thresholds SLO
 * 
 * @returns Array de alertas
 */
export async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // Verificar DLQ
  const dlqCount = await getDLQCount();
  if (dlqCount > SLO.dlq_count) {
    alerts.push({
      id: 'dlq_above_zero',
      severity: 'critical',
      metric: 'dlq_count',
      message: `DLQ count (${dlqCount}) excede threshold (${SLO.dlq_count}). Revisar integration_runs fallidos.`,
      value: dlqCount,
      threshold: SLO.dlq_count,
      timestamp: new Date()
    });
  }
  
  // Verificar matched rate
  const matchingStats = await getMatchingMetrics();
  if (matchingStats.matchRate < SLO.matched_rate_pct) {
    alerts.push({
      id: 'matched_rate_below_threshold',
      severity: 'critical',
      metric: 'matched_rate',
      message: `Matched rate (${matchingStats.matchRate.toFixed(2)}%) por debajo del SLO (${SLO.matched_rate_pct}%). Revisar reglas de matching.`,
      value: matchingStats.matchRate,
      threshold: SLO.matched_rate_pct,
      timestamp: new Date()
    });
  }
  
  // Verificar latencia (simulado)
  const latencyMetrics = await getLatencyMetrics();
  for (const metric of latencyMetrics) {
    if (metric.status === 'critical' && metric.threshold) {
      alerts.push({
        id: `latency_${metric.name}`,
        severity: 'critical',
        metric: metric.name,
        message: `Latencia p95 (${metric.value.toFixed(0)}ms) excede SLO (${metric.threshold}ms).`,
        value: metric.value,
        threshold: metric.threshold,
        timestamp: new Date()
      });
    }
  }
  
  // Verificar DQ (warnings)
  const dqMetrics = await getDataQualityMetrics();
  for (const metric of dqMetrics) {
    if (metric.status === 'warning' && metric.threshold) {
      alerts.push({
        id: `dq_${metric.name}`,
        severity: 'warning',
        metric: metric.name,
        message: `Data quality issue: ${metric.name} (${metric.value}) excede threshold (${metric.threshold}).`,
        value: metric.value,
        threshold: metric.threshold,
        timestamp: new Date()
      });
    }
  }
  
  return alerts;
}

/**
 * Obtiene dashboard completo con métricas y alertas
 * 
 * @param from - Fecha inicio (opcional)
 * @param to - Fecha fin (opcional)
 * @returns Dashboard completo
 */
export async function getDashboardMetrics(from?: string, to?: string): Promise<Dashboard> {
  const [latencyMetrics, qualityMetrics, matchingMetrics, volumeMetrics, alerts] = await Promise.all([
    getLatencyMetrics(from, to),
    getDataQualityMetrics(),
    getMatchingMetricsForDashboard(),
    getVolumeMetrics(),
    checkAlerts()
  ]);
  
  const allMetrics = [...latencyMetrics, ...qualityMetrics, ...matchingMetrics, ...volumeMetrics];
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (criticalAlerts > 0) {
    overallStatus = 'critical';
  } else if (warningAlerts > 0) {
    overallStatus = 'degraded';
  }
  
  return {
    metrics: {
      latency: latencyMetrics,
      quality: qualityMetrics,
      matching: matchingMetrics,
      volume: volumeMetrics
    },
    alerts,
    summary: {
      totalMetrics: allMetrics.length,
      criticalAlerts,
      warningAlerts,
      overallStatus
    }
  };
}
