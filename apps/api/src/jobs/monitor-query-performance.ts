/**
 * Job de Monitoreo de Performance de Queries con pg_stat_statements
 *
 * Monitorea queries lentas usando pg_stat_statements y genera alertas
 * cuando se detectan queries que exceden umbrales de performance.
 *
 * Se ejecuta diariamente vía scheduler para detectar problemas proactivamente.
 *
 * AI_DECISION: Monitoreo de performance con pg_stat_statements
 * Justificación: Necesitamos detectar queries lentas automáticamente y generar alertas
 * Impacto: Detección proactiva de problemas, mejor visibilidad de performance
 */

import { getSlowQueries, getPerformanceSummary, type SlowQuery } from '../utils/pg-stat-statements';
import { db } from '@cactus/db';
import { notifications } from '@cactus/db/schema';
import { sql, eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'monitor-query-performance' });

interface Alert {
  severity: 'warning' | 'critical';
  type: 'slow_query' | 'performance_degradation';
  message: string;
  details?: Record<string, unknown>;
}

export class MonitorQueryPerformanceJob {
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
  private readonly CRITICAL_QUERY_THRESHOLD_MS = 5000; // 5 seconds
  private readonly MAX_ALERT_QUERIES = 10; // Máximo de queries a incluir en alerta

  /**
   * Ejecutar monitoreo de performance y generar alertas
   */
  async run(): Promise<void> {
    logger.info('🔍 Iniciando monitoreo de performance de queries...');

    try {
      const alerts: Alert[] = [];

      // 1. Obtener resumen de performance
      const summary = await getPerformanceSummary();

      if (!summary.enabled) {
        logger.warn('pg_stat_statements no está habilitado, saltando monitoreo');
        return;
      }

      logger.info(
        {
          totalQueries: summary.totalQueries,
          totalTime: summary.totalTime,
          avgQueryTime: summary.avgQueryTime,
          slowQueriesCount: summary.slowQueriesCount,
        },
        'Resumen de performance'
      );

      // 2. Detectar queries lentas
      const slowQueries = await getSlowQueries(
        this.SLOW_QUERY_THRESHOLD_MS,
        this.MAX_ALERT_QUERIES
      );

      if (slowQueries.length > 0) {
        // Separar queries críticas de warnings
        const criticalQueries = slowQueries.filter(
          (q) => q.meanExecTime >= this.CRITICAL_QUERY_THRESHOLD_MS
        );
        const warningQueries = slowQueries.filter(
          (q) => q.meanExecTime < this.CRITICAL_QUERY_THRESHOLD_MS
        );

        if (criticalQueries.length > 0) {
          alerts.push({
            severity: 'critical',
            type: 'slow_query',
            message: `Se detectaron ${criticalQueries.length} queries críticas (tiempo promedio >= ${this.CRITICAL_QUERY_THRESHOLD_MS}ms)`,
            details: {
              queries: criticalQueries.slice(0, 5).map((q) => ({
                query: this.sanitizeQuery(q.query),
                calls: q.calls,
                meanExecTime: q.meanExecTime,
                maxExecTime: q.maxExecTime,
                totalExecTime: q.totalExecTime,
              })),
            },
          });
        }

        if (warningQueries.length > 0) {
          alerts.push({
            severity: 'warning',
            type: 'slow_query',
            message: `Se detectaron ${warningQueries.length} queries lentas (tiempo promedio >= ${this.SLOW_QUERY_THRESHOLD_MS}ms)`,
            details: {
              queries: warningQueries.slice(0, 5).map((q) => ({
                query: this.sanitizeQuery(q.query),
                calls: q.calls,
                meanExecTime: q.meanExecTime,
                maxExecTime: q.maxExecTime,
                totalExecTime: q.totalExecTime,
              })),
            },
          });
        }
      }

      // 3. Detectar degradación de performance general
      if (summary.avgQueryTime > this.SLOW_QUERY_THRESHOLD_MS) {
        alerts.push({
          severity: 'warning',
          type: 'performance_degradation',
          message: `Tiempo promedio de queries elevado: ${summary.avgQueryTime.toFixed(2)}ms`,
          details: {
            avgQueryTime: summary.avgQueryTime,
            totalQueries: summary.totalQueries,
            slowQueriesCount: summary.slowQueriesCount,
          },
        });
      }

      // 4. Enviar alertas si hay problemas
      if (alerts.length > 0) {
        await this.sendAlerts(alerts);
        logger.warn({ alertCount: alerts.length }, '⚠️ Alertas de performance generadas');
      } else {
        logger.info('✅ No se detectaron problemas de performance');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error en monitoreo de performance');
      throw error;
    }
  }

  /**
   * Sanitizar query para mostrar en alertas (remover información sensible)
   */
  private sanitizeQuery(query: string): string {
    // Truncar queries muy largas
    if (query.length > 200) {
      return query.substring(0, 200) + '...';
    }
    return query;
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
        if (alert.details.queries) {
          message += `  Queries detectadas:\n`;
          const queries = alert.details.queries as Array<{
            query: string;
            calls: number;
            meanExecTime: number;
            maxExecTime: number;
            totalExecTime: number;
          }>;
          for (const q of queries) {
            message += `    - ${q.query.substring(0, 100)}...\n`;
            message += `      Llamadas: ${q.calls}, Tiempo promedio: ${q.meanExecTime.toFixed(2)}ms\n`;
          }
        } else {
          message += `  Detalles: ${JSON.stringify(alert.details, null, 2)}\n`;
        }
      }
      message += '\n';
    }

    return message;
  }
}
