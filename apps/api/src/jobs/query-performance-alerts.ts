/**
 * Job de Alertas de Performance de Queries
 *
 * Detecta queries degradadas, sequential scans nuevos y cache hit rate bajo.
 * Envía notificaciones a admins cuando se detectan problemas.
 *
 * Se ejecuta diariamente vía cron job.
 */

import { getQueryMetrics, getSlowQueries, getNPlusOneQueries } from '../utils/database/db-logger';
import { getCacheHealth } from '../utils/performance/cache';
import pino from 'pino';
import { db } from '@cactus/db';
import { notifications } from '@cactus/db/schema';
import { eq, sql } from 'drizzle-orm';

const logger = pino({ name: 'query-performance-alerts' });

interface Alert {
  severity: 'warning' | 'critical';
  type: 'slow_query' | 'n_plus_one' | 'sequential_scan' | 'low_cache_hit_rate';
  message: string;
  details?: Record<string, unknown>;
}

export class QueryPerformanceAlertsJob {
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
  private readonly CACHE_HIT_RATE_THRESHOLD = 50; // 50%
  private readonly DEGRADATION_FACTOR = 2; // 2x slower than average

  /**
   * Ejecutar análisis de performance y generar alertas
   */
  async run(): Promise<void> {
    logger.info('🔍 Iniciando análisis de performance de queries...');

    try {
      const alerts: Alert[] = [];

      // 1. Detectar queries degradadas (>2x tiempo promedio)
      const degradedQueries = this.detectDegradedQueries();
      alerts.push(...degradedQueries);

      // 2. Detectar queries lentas persistentes
      const slowQueries = getSlowQueries(this.SLOW_QUERY_THRESHOLD_MS);
      if (slowQueries.length > 0) {
        alerts.push({
          severity: 'warning',
          type: 'slow_query',
          message: `Se detectaron ${slowQueries.length} queries lentas (p95 > ${this.SLOW_QUERY_THRESHOLD_MS}ms)`,
          details: {
            queries: slowQueries.slice(0, 10).map((q) => ({
              operation: q.operationBase,
              p95Duration: q.p95Duration,
              count: q.count,
            })),
          },
        });
      }

      // 3. Detectar queries N+1
      const nPlusOneQueries = getNPlusOneQueries();
      if (nPlusOneQueries.length > 0) {
        alerts.push({
          severity: 'critical',
          type: 'n_plus_one',
          message: `Se detectaron ${nPlusOneQueries.length} patrones N+1`,
          details: {
            queries: nPlusOneQueries.map((q) => ({
              operation: q.operationBase,
              nPlusOneCount: q.nPlusOneCount,
              totalCount: q.count,
            })),
          },
        });
      }

      // 4. Verificar cache hit rate
      const cacheHealth = getCacheHealth();
      const cacheEntries = Object.entries(cacheHealth);
      for (const [name, stats] of cacheEntries) {
        // Skip totalMemoryBytes and maxMemoryBytes entries
        if (name === 'totalMemoryBytes' || name === 'maxMemoryBytes') {
          continue;
        }

        // Type guard to ensure stats has the expected structure
        if (
          typeof stats === 'object' &&
          stats !== null &&
          'hitRate' in stats &&
          'hits' in stats &&
          'misses' in stats
        ) {
          const cacheStats = stats as { hitRate: number; hits: number; misses: number };
          if (
            cacheStats.hitRate < this.CACHE_HIT_RATE_THRESHOLD &&
            cacheStats.hits + cacheStats.misses > 100
          ) {
            alerts.push({
              severity: 'warning',
              type: 'low_cache_hit_rate',
              message: `Cache hit rate bajo para ${name}: ${cacheStats.hitRate.toFixed(1)}%`,
              details: {
                cacheName: name,
                hitRate: cacheStats.hitRate,
                hits: cacheStats.hits,
                misses: cacheStats.misses,
              },
            });
          }
        }
      }

      // 5. Enviar notificaciones si hay alertas
      if (alerts.length > 0) {
        await this.sendAlerts(alerts);
        logger.warn({ alertCount: alerts.length }, '⚠️ Alertas de performance generadas');
      } else {
        logger.info('✅ No se detectaron problemas de performance');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error en análisis de performance');
      throw error;
    }
  }

  /**
   * Detecta queries degradadas (más de 2x tiempo promedio)
   */
  private detectDegradedQueries(): Alert[] {
    const allMetrics = getQueryMetrics();
    const alerts: Alert[] = [];

    for (const metric of allMetrics) {
      // Solo alertar si hay suficientes ejecuciones para ser significativo
      if (metric.count < 10) continue;

      // Calcular promedio histórico (simplificado: usar avgDuration como baseline)
      const baseline = metric.avgDuration;
      const currentP95 = metric.p95Duration;

      // Si p95 es más de 2x el promedio, considerar degradado
      if (currentP95 > baseline * this.DEGRADATION_FACTOR && currentP95 > 500) {
        alerts.push({
          severity: 'warning',
          type: 'slow_query',
          message: `Query degradada detectada: ${metric.operationBase}`,
          details: {
            operation: metric.operationBase,
            avgDuration: metric.avgDuration,
            p95Duration: metric.p95Duration,
            degradationFactor: (currentP95 / baseline).toFixed(2),
            count: metric.count,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Enviar alertas a administradores
   */
  private async sendAlerts(alerts: Alert[]): Promise<void> {
    try {
      // Obtener usuarios admin
      const adminUsers = await db()
        .select({ id: sql`id` })
        .from(sql`users`)
        .where(sql`role = 'admin' AND is_active = true`);

      if (adminUsers.length === 0) {
        logger.warn('No se encontraron usuarios admin para enviar alertas');
        return;
      }

      // Agrupar alertas por severidad
      const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
      const warningAlerts = alerts.filter((a) => a.severity === 'warning');

      // Crear notificaciones para cada admin
      for (const admin of adminUsers) {
        const adminId = (admin as { id: string }).id;

        if (criticalAlerts.length > 0) {
          await db()
            .insert(notifications)
            .values({
              userId: adminId,
              type: sql`(SELECT id FROM lookup_notification_type WHERE id = 'critical')`,
              severity: 'critical',
              renderedBody: this.formatAlertMessage(criticalAlerts, 'critical'),
              payload: { alerts: criticalAlerts },
            });
        }

        if (warningAlerts.length > 0) {
          await db()
            .insert(notifications)
            .values({
              userId: adminId,
              type: sql`(SELECT id FROM lookup_notification_type WHERE id = 'info')`,
              severity: 'warning',
              renderedBody: this.formatAlertMessage(warningAlerts, 'warning'),
              payload: { alerts: warningAlerts },
            });
        }
      }

      logger.info(
        {
          adminCount: adminUsers.length,
          criticalCount: criticalAlerts.length,
          warningCount: warningAlerts.length,
        },
        'Alertas enviadas a administradores'
      );
    } catch (error) {
      logger.error({ err: error }, 'Error enviando alertas');
      throw error;
    }
  }

  /**
   * Formatear mensaje de alerta
   */
  private formatAlertMessage(alerts: Alert[], severity: string): string {
    const severityLabel = severity === 'critical' ? 'CRÍTICO' : 'ADVERTENCIA';
    let message = `[${severityLabel}] Alertas de Performance de Queries\n\n`;

    for (const alert of alerts) {
      message += `• ${alert.message}\n`;
      if (alert.details) {
        message += `  Detalles: ${JSON.stringify(alert.details, null, 2)}\n`;
      }
      message += '\n';
    }

    return message;
  }
}
