/**
 * Query Analyzer
 *
 * Analiza queries existentes para identificar problemas de performance,
 * queries N+1, y generar recomendaciones de optimización.
 */

import {
  getQueryMetrics,
  getSlowQueries,
  getNPlusOneQueries,
  type AggregatedQueryMetrics,
} from './database/db-logger';

export interface QueryAnalysisReport {
  timestamp: Date;
  slowQueries: AggregatedQueryMetrics[];
  nPlusOneQueries: AggregatedQueryMetrics[];
  allMetrics: AggregatedQueryMetrics[];
  recommendations: QueryRecommendation[];
}

interface QueryRecommendation {
  operation: string;
  severity: 'high' | 'medium' | 'low';
  issue: string;
  recommendation: string;
  estimatedImpact: string;
}

/**
 * Analiza queries y genera reporte con recomendaciones
 */
export function analyzeQueries(thresholdMs: number = 500): QueryAnalysisReport {
  const allMetrics = getQueryMetrics();
  const slowQueries = getSlowQueries(thresholdMs);
  const nPlusOneQueries = getNPlusOneQueries();

  const recommendations: QueryRecommendation[] = [];

  // Analizar queries lentas
  for (const metric of slowQueries) {
    if (metric.avgDuration > 1000) {
      recommendations.push({
        operation: metric.operationBase,
        severity: 'high',
        issue: `Query promedio ${metric.avgDuration}ms, p95: ${metric.p95Duration}ms`,
        recommendation:
          'Revisar uso de índices, considerar optimización de JOINs o agregación de datos',
        estimatedImpact: 'Reducción estimada: 50-70% en tiempo de ejecución',
      });
    } else if (metric.avgDuration > 500) {
      recommendations.push({
        operation: metric.operationBase,
        severity: 'medium',
        issue: `Query promedio ${metric.avgDuration}ms, p95: ${metric.p95Duration}ms`,
        recommendation: 'Revisar índices compuestos y filtros WHERE',
        estimatedImpact: 'Reducción estimada: 30-50% en tiempo de ejecución',
      });
    }
  }

  // Analizar queries N+1
  for (const metric of nPlusOneQueries) {
    recommendations.push({
      operation: metric.operationBase,
      severity: 'high',
      issue: `Patrón N+1 detectado: ${metric.nPlusOneCount} ocurrencias`,
      recommendation: 'Implementar batch query usando inArray() o data loader',
      estimatedImpact: `Reducción de ${metric.nPlusOneCount}+ queries a 1 query batch`,
    });
  }

  // Identificar queries con alta frecuencia
  const highFrequencyQueries = allMetrics
    .filter((m) => m.count > 100 && m.avgDuration > 100)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const metric of highFrequencyQueries) {
    if (!recommendations.find((r) => r.operation === metric.operationBase)) {
      recommendations.push({
        operation: metric.operationBase,
        severity: 'medium',
        issue: `Query ejecutada ${metric.count} veces con promedio ${metric.avgDuration}ms`,
        recommendation: 'Considerar implementar caché para esta query frecuente',
        estimatedImpact: 'Reducción de carga en DB y mejora de latencia',
      });
    }
  }

  return {
    timestamp: new Date(),
    slowQueries,
    nPlusOneQueries,
    allMetrics,
    recommendations: recommendations.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }),
  };
}

/**
 * Genera reporte de texto legible
 */
export function generateTextReport(report: QueryAnalysisReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('QUERY ANALYSIS REPORT');
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push(`Total Queries Analyzed: ${report.allMetrics.length}`);
  lines.push(`Slow Queries (>500ms p95): ${report.slowQueries.length}`);
  lines.push(`N+1 Queries Detected: ${report.nPlusOneQueries.length}`);
  lines.push('');

  if (report.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS:');
    lines.push('-'.repeat(80));

    for (const rec of report.recommendations) {
      lines.push(`[${rec.severity.toUpperCase()}] ${rec.operation}`);
      lines.push(`  Issue: ${rec.issue}`);
      lines.push(`  Recommendation: ${rec.recommendation}`);
      lines.push(`  Estimated Impact: ${rec.estimatedImpact}`);
      lines.push('');
    }
  }

  if (report.slowQueries.length > 0) {
    lines.push('SLOW QUERIES:');
    lines.push('-'.repeat(80));
    for (const metric of report.slowQueries.slice(0, 10)) {
      lines.push(`${metric.operationBase}:`);
      lines.push(`  Count: ${metric.count}`);
      lines.push(`  Avg: ${metric.avgDuration.toFixed(2)}ms`);
      lines.push(`  P95: ${metric.p95Duration.toFixed(2)}ms`);
      lines.push(`  P99: ${metric.p99Duration.toFixed(2)}ms`);
      lines.push('');
    }
  }

  if (report.nPlusOneQueries.length > 0) {
    lines.push('N+1 QUERIES:');
    lines.push('-'.repeat(80));
    for (const metric of report.nPlusOneQueries) {
      lines.push(`${metric.operationBase}:`);
      lines.push(`  N+1 Count: ${metric.nPlusOneCount}`);
      lines.push(`  Total Executions: ${metric.count}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
