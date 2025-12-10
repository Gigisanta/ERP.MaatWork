/**
 * Job de Reporte Semanal de Performance
 *
 * Genera reporte semanal comparando métricas semana a semana.
 * Identifica tendencias de degradación y mejoras.
 *
 * Se ejecuta semanalmente (domingos) vía cron job.
 */

import { getQueryMetrics, getSlowQueries, getNPlusOneQueries } from '../utils/database/db-logger';
import { getCacheHealth } from '../utils/performance/cache';
import { analyzeQueries, generateTextReport } from '../utils/query-analyzer';
import pino from 'pino';
import { writeFileSync } from 'fs';
import { join } from 'path';

const logger = pino({ name: 'weekly-performance-report' });

interface WeeklyMetrics {
  week: string; // ISO week string (YYYY-WW)
  timestamp: string;
  totalQueries: number;
  slowQueriesCount: number;
  nPlusOneQueriesCount: number;
  overallCacheHitRate: number;
  topSlowQueries: Array<{
    operation: string;
    p95Duration: number;
    count: number;
  }>;
}

export class WeeklyPerformanceReportJob {
  /**
   * Generar reporte semanal de performance
   */
  async run(): Promise<void> {
    logger.info('📊 Generando reporte semanal de performance...');

    try {
      // Obtener métricas actuales
      const currentMetrics = await this.collectCurrentMetrics();

      // Generar análisis completo
      const analysis = analyzeQueries(500);
      const textReport = generateTextReport(analysis);

      // Calcular cache hit rate general
      const cacheHealth = getCacheHealth();
      const cacheStats = Object.values(cacheHealth);

      // Type for cache stats from NodeCache
      interface CacheStatsEntry {
        hits: number;
        misses: number;
        keys: number;
        ksize: number;
        vsize: number;
        hitRate: number;
      }

      const totalHits = cacheStats.reduce(
        (sum: number, stats: CacheStatsEntry) => sum + (stats.hits || 0),
        0
      );
      const totalMisses = cacheStats.reduce(
        (sum: number, stats: CacheStatsEntry) => sum + (stats.misses || 0),
        0
      );
      const overallCacheHitRate =
        totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

      // Crear reporte
      const report = {
        timestamp: new Date().toISOString(),
        week: this.getCurrentWeek(),
        metrics: currentMetrics,
        cacheHitRate: overallCacheHitRate,
        analysis: {
          recommendations: analysis.recommendations,
          summary: {
            totalQueries: currentMetrics.totalQueries,
            slowQueriesCount: currentMetrics.slowQueriesCount,
            nPlusOneQueriesCount: currentMetrics.nPlusOneQueriesCount,
          },
        },
        textReport,
      };

      // Guardar reporte JSON
      const reportPath = join(
        process.cwd(),
        'docs',
        `WEEKLY_PERFORMANCE_REPORT_${this.getCurrentWeek()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      logger.info(`✅ Reporte JSON guardado en: ${reportPath}`);

      // Guardar reporte de texto
      const textReportPath = join(
        process.cwd(),
        'docs',
        `WEEKLY_PERFORMANCE_REPORT_${this.getCurrentWeek()}.txt`
      );
      writeFileSync(textReportPath, textReport, 'utf-8');
      logger.info(`✅ Reporte de texto guardado en: ${textReportPath}`);

      // Comparar con semana anterior si existe
      const comparison = await this.compareWithPreviousWeek(currentMetrics);
      if (comparison) {
        logger.info('📈 Comparación con semana anterior:', comparison);
      }

      logger.info('✅ Reporte semanal generado exitosamente');
    } catch (error) {
      logger.error({ err: error }, '❌ Error generando reporte semanal');
      throw error;
    }
  }

  /**
   * Recolectar métricas actuales
   */
  private async collectCurrentMetrics(): Promise<WeeklyMetrics> {
    const allMetrics = getQueryMetrics();
    const slowQueries = getSlowQueries(500);
    const nPlusOneQueries = getNPlusOneQueries();

    return {
      week: this.getCurrentWeek(),
      timestamp: new Date().toISOString(),
      totalQueries: allMetrics.length,
      slowQueriesCount: slowQueries.length,
      nPlusOneQueriesCount: nPlusOneQueries.length,
      overallCacheHitRate: 0, // Se calculará después
      topSlowQueries: slowQueries.slice(0, 10).map((q) => ({
        operation: q.operationBase,
        p95Duration: q.p95Duration,
        count: q.count,
      })),
    };
  }

  /**
   * Obtener semana actual en formato ISO (YYYY-WW)
   */
  private getCurrentWeek(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Comparar con semana anterior
   */
  private async compareWithPreviousWeek(current: WeeklyMetrics): Promise<{
    slowQueriesChange: number;
    nPlusOneChange: number;
    cacheHitRateChange: number;
  } | null> {
    // Intentar cargar reporte de semana anterior
    // (Implementación simplificada - en producción usar base de datos o almacenamiento persistente)
    try {
      const { readFileSync } = await import('fs');
      const previousWeek = this.getPreviousWeek();
      const previousReportPath = join(
        process.cwd(),
        'docs',
        `WEEKLY_PERFORMANCE_REPORT_${previousWeek}.json`
      );

      const previousReportContent = readFileSync(previousReportPath, 'utf-8');
      const previousReport = JSON.parse(previousReportContent) as { metrics: WeeklyMetrics };

      return {
        slowQueriesChange: current.slowQueriesCount - previousReport.metrics.slowQueriesCount,
        nPlusOneChange: current.nPlusOneQueriesCount - previousReport.metrics.nPlusOneQueriesCount,
        cacheHitRateChange:
          current.overallCacheHitRate - previousReport.metrics.overallCacheHitRate,
      };
    } catch (error) {
      // No hay reporte anterior, es la primera semana
      logger.debug('No se encontró reporte de semana anterior');
      return null;
    }
  }

  /**
   * Obtener semana anterior
   */
  private getPreviousWeek(): string {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
