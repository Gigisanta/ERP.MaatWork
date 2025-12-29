/**
 * Sistema de Scheduling Centralizado
 *
 * Proporciona un sistema centralizado para ejecutar jobs programados
 * usando node-cron. Todos los jobs automáticos deben registrarse aquí.
 *
 * AI_DECISION: Sistema de scheduling centralizado con node-cron
 * Justificación: Necesitamos ejecutar jobs automáticos (mantenimiento, monitoreo) de forma confiable
 * Impacto: Automatización de tareas críticas, mejor mantenibilidad, jobs centralizados
 */

import cron, { type ScheduledTask } from 'node-cron';
import pino from 'pino';
import { runDailyMaintenance, runWeeklyMaintenance } from './maintenance';
import { MonitorQueryPerformanceJob } from './monitor-query-performance';
import { refreshExpiringTokens } from './google-token-refresh';

const logger = pino({ name: 'scheduler' });

/**
 * Clase principal del scheduler
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private isEnabled: boolean;

  constructor() {
    // Deshabilitar scheduler en tests o si se especifica explícitamente
    this.isEnabled = process.env.NODE_ENV !== 'test' && process.env.DISABLE_SCHEDULER !== 'true';
  }

  /**
   * Iniciar todos los jobs programados
   */
  start(): void {
    if (!this.isEnabled) {
      logger.info('Scheduler deshabilitado (NODE_ENV=test o DISABLE_SCHEDULER=true)');
      return;
    }

    logger.info('🚀 Iniciando scheduler de jobs...');

    // Job diario: Mantenimiento de base de datos (2:00 AM)
    this.scheduleJob('daily-maintenance', '0 2 * * *', async () => {
      logger.info('🔧 Ejecutando mantenimiento diario...');
      try {
        await runDailyMaintenance();

        // Refresh de materialized views después del mantenimiento
        const { RefreshMaterializedViewsJob } = await import('./refresh-materialized-views');
        const refreshJob = new RefreshMaterializedViewsJob();
        await refreshJob.refreshAll();

        logger.info('✅ Mantenimiento diario completado');
      } catch (error) {
        logger.error({ err: error }, '❌ Error en mantenimiento diario');
      }
    });

    // Job diario: Monitoreo de performance de queries (2:30 AM)
    this.scheduleJob('monitor-query-performance', '30 2 * * *', async () => {
      logger.info('🔍 Ejecutando monitoreo de performance...');
      try {
        const job = new MonitorQueryPerformanceJob();
        await job.run();
        logger.info('✅ Monitoreo de performance completado');
      } catch (error) {
        logger.error({ err: error }, '❌ Error en monitoreo de performance');
      }
    });

    // Job semanal: Mantenimiento semanal (Domingo 3:00 AM)
    this.scheduleJob('weekly-maintenance', '0 3 * * 0', async () => {
      logger.info('🔧 Ejecutando mantenimiento semanal...');
      try {
        await runWeeklyMaintenance();
        logger.info('✅ Mantenimiento semanal completado');
      } catch (error) {
        logger.error({ err: error }, '❌ Error en mantenimiento semanal');
      }
    });

    // Job mensual: Mantenimiento de particiones (Día 1, 4:00 AM)
    this.scheduleJob('monthly-partition-maintenance', '0 4 1 * *', async () => {
      logger.info('🧹 Ejecutando mantenimiento mensual de particiones...');
      try {
        // 1. Crear particiones futuras (próximos 3 meses)
        await this.createFuturePartitions();

        // 2. Limpiar particiones antiguas (> 12 meses)
        await this.cleanupOldPartitions();

        logger.info('✅ Mantenimiento de particiones completado');
      } catch (error) {
        logger.error({ err: error }, '❌ Error en mantenimiento de particiones');
      }
    });

    // Job periódico: Refresh de tokens de Google OAuth (cada 10 minutos)
    this.scheduleJob('refresh-google-tokens', '*/10 * * * *', async () => {
      logger.debug('🔄 Refrescando tokens de Google OAuth expirados...');
      try {
        await refreshExpiringTokens();
        logger.debug('✅ Refresh de tokens completado');
      } catch (error) {
        logger.error({ err: error }, '❌ Error refrescando tokens de Google');
      }
    });

    logger.info({ jobCount: this.jobs.size }, '✅ Scheduler iniciado con jobs programados');
  }

  /**
   * Detener todos los jobs programados
   */
  stop(): void {
    logger.info('🛑 Deteniendo scheduler...');

    for (const [name, task] of this.jobs.entries()) {
      task.stop();
      logger.info({ job: name }, 'Job detenido');
    }

    this.jobs.clear();
    logger.info('✅ Scheduler detenido');
  }

  /**
   * Programar un job con cron
   *
   * @param name Nombre único del job
   * @param cronExpression Expresión cron (ej: '0 2 * * *' para 2:00 AM diario)
   * @param task Función async a ejecutar
   */
  private scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      logger.warn({ job: name }, 'Job ya existe, omitiendo');
      return;
    }

    // Validar expresión cron
    if (!cron.validate(cronExpression)) {
      logger.error({ job: name, cronExpression }, 'Expresión cron inválida');
      return;
    }

    const scheduledTask = cron.schedule(
      cronExpression,
      async () => {
        const startTime = Date.now();
        logger.info({ job: name }, `Ejecutando job: ${name}`);

        try {
          await task();
          const duration = Date.now() - startTime;
          logger.info({ job: name, duration }, `Job completado: ${name}`);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error({ err: error, job: name, duration }, `Error ejecutando job: ${name}`);
        }
      },
      {
        scheduled: true,
        timezone: 'America/Argentina/Buenos_Aires',
      } as Parameters<typeof cron.schedule>[2]
    );

    this.jobs.set(name, scheduledTask);
    logger.info({ job: name, cronExpression }, `Job programado: ${name}`);
  }

  /**
   * Crear particiones futuras automáticamente
   *
   * Crea particiones para los próximos 3 meses para tablas particionadas
   */
  private async createFuturePartitions(): Promise<void> {
    const { db } = await import('@maatwork/db');
    const { sql } = await import('drizzle-orm');

    try {
      // Verificar si existen funciones de particionamiento
      const functionsExist = await db().execute(sql`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'create_future_partitions'
        ) as exists
      `);

      if (!(functionsExist.rows[0] as { exists: boolean }).exists) {
        logger.debug('Partitioning functions not available, skipping partition creation');
        return;
      }

      // Tablas particionadas que necesitan particiones futuras
      const partitionedTables = [
        { name: 'audit_logs', strategy: 'monthly' },
        { name: 'broker_transactions', strategy: 'monthly' },
        { name: 'broker_positions', strategy: 'monthly' },
        { name: 'activity_events', strategy: 'monthly' },
        { name: 'aum_snapshots', strategy: 'monthly' },
      ];

      for (const table of partitionedTables) {
        try {
          // Verificar si la tabla está particionada
          const isPartitioned = await db().execute(sql`
            SELECT EXISTS (
              SELECT FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public'
                AND c.relname = ${table.name}
                AND c.relkind = 'p'
            ) as is_partitioned
          `);

          if (!(isPartitioned.rows[0] as { is_partitioned: boolean }).is_partitioned) {
            logger.debug({ table: table.name }, 'Table is not partitioned, skipping');
            continue;
          }

          // Crear particiones futuras (3 meses adelante)
          await db().execute(
            sql.raw(`SELECT create_future_partitions('${table.name}', 3, '${table.strategy}')`)
          );
          logger.info({ table: table.name }, 'Future partitions created');
        } catch (error) {
          logger.error({ err: error, table: table.name }, 'Error creating future partitions');
          // Continue with other tables even if one fails
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error in createFuturePartitions');
      // No throw - esto es opcional y no debe fallar el mantenimiento mensual
    }
  }

  /**
   * Limpiar particiones antiguas (más de 12 meses)
   *
   * Esta función elimina particiones de tablas que tienen más de 12 meses
   * para mantener el tamaño de la base de datos bajo control.
   */
  private async cleanupOldPartitions(): Promise<void> {
    const { db } = await import('@maatwork/db');
    const { sql } = await import('drizzle-orm');

    try {
      // Obtener particiones antiguas (más de 12 meses)
      const oldPartitions = await db().execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE '%_%_%'  -- Patrón de particiones: tabla_YYYY_MM
          AND tablename ~ '_\d{4}_\d{2}$'  -- Termina con _YYYY_MM
        ORDER BY tablename
      `);

      if (oldPartitions.rows.length === 0) {
        logger.info('No se encontraron particiones antiguas para limpiar');
        return;
      }

      logger.info({ count: oldPartitions.rows.length }, 'Particiones encontradas');

      // Calcular fecha límite (12 meses atrás)
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 12);

      let cleanedCount = 0;
      for (const partition of oldPartitions.rows) {
        const tableName = (partition as { tablename: string }).tablename;

        // Extraer año y mes del nombre de la partición
        const match = tableName.match(/_(\d{4})_(\d{2})$/);
        if (!match) continue;

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Mes es 0-indexed en JS
        const partitionDate = new Date(year, month, 1);

        // Si la partición es más antigua que la fecha límite, eliminarla
        if (partitionDate < cutoffDate) {
          try {
            await db().execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));
            logger.info({ partition: tableName }, 'Partición eliminada');
            cleanedCount++;
          } catch (error) {
            logger.error({ err: error, partition: tableName }, 'Error eliminando partición');
          }
        }
      }

      logger.info({ cleanedCount }, 'Limpieza de particiones completada');
    } catch (error) {
      logger.error({ err: error }, 'Error en limpieza de particiones');
      throw error;
    }
  }

  /**
   * Obtener estado de todos los jobs
   * Note: node-cron ScheduledTask doesn't have getStatus(),
   * so we track if the job is registered (exists in the map)
   */
  getStatus(): Array<{ name: string; running: boolean }> {
    return Array.from(this.jobs.entries()).map(([name]) => ({
      name,
      running: this.isEnabled, // If scheduler is enabled, job is running
    }));
  }
}

// Singleton instance
let schedulerInstance: JobScheduler | null = null;

/**
 * Obtener instancia singleton del scheduler
 */
export function getScheduler(): JobScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new JobScheduler();
  }
  return schedulerInstance;
}
