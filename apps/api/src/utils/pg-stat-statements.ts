/**
 * Utilidades para consultar pg_stat_statements
 * 
 * Proporciona funciones TypeScript para consultar estadísticas de queries
 * desde pg_stat_statements y detectar problemas de performance.
 * 
 * AI_DECISION: Utilidades para monitoreo de performance con pg_stat_statements
 * Justificación: Necesitamos herramientas para detectar queries lentas y problemas de performance
 * Impacto: Detección proactiva de problemas, alertas automáticas, mejor visibilidad
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'pg-stat-statements' });

/**
 * Interfaz para query lenta
 */
export interface SlowQuery {
  query: string;
  calls: number;
  totalExecTime: number;
  meanExecTime: number;
  maxExecTime: number;
  minExecTime: number;
  stddevExecTime: number;
  rows: number;
}

/**
 * Interfaz para query frecuente
 */
export interface FrequentQuery {
  query: string;
  calls: number;
  totalExecTime: number;
  meanExecTime: number;
  rows: number;
}

/**
 * Interfaz para query por tiempo total
 */
export interface QueryByTotalTime {
  query: string;
  calls: number;
  totalExecTime: number;
  meanExecTime: number;
  percentageTotalTime: number;
  rows: number;
}

/**
 * Verificar si pg_stat_statements está habilitado
 */
export async function isPgStatStatementsEnabled(): Promise<boolean> {
  try {
    const result = await db().execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_extension 
        WHERE extname = 'pg_stat_statements'
      ) as enabled
    `);
    
    const enabled = (result.rows[0] as { enabled: boolean })?.enabled ?? false;
    
    if (!enabled) {
      logger.warn('pg_stat_statements no está habilitado. Requiere agregar a shared_preload_libraries y reiniciar PostgreSQL');
    }
    
    return enabled;
  } catch (error) {
    logger.error({ err: error }, 'Error verificando pg_stat_statements');
    return false;
  }
}

/**
 * Obtener queries lentas usando función helper de PostgreSQL
 * 
 * @param thresholdMs Umbral mínimo de tiempo promedio en milisegundos (default: 1000)
 * @param limitCount Número máximo de resultados (default: 20)
 */
export async function getSlowQueries(
  thresholdMs: number = 1000,
  limitCount: number = 20
): Promise<SlowQuery[]> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      logger.warn('pg_stat_statements no está habilitado, retornando array vacío');
      return [];
    }

    const result = await db().execute(sql`
      SELECT * FROM get_slow_queries(${thresholdMs}, ${limitCount})
    `);

    return result.rows.map((row: Record<string, unknown>) => ({
      query: (row as { query: string }).query,
      calls: Number((row as { calls: string | number }).calls),
      totalExecTime: Number((row as { total_exec_time: string | number }).total_exec_time),
      meanExecTime: Number((row as { mean_exec_time: string | number }).mean_exec_time),
      maxExecTime: Number((row as { max_exec_time: string | number }).max_exec_time),
      minExecTime: Number((row as { min_exec_time: string | number }).min_exec_time),
      stddevExecTime: Number((row as { stddev_exec_time: string | number }).stddev_exec_time),
      rows: Number((row as { rows: string | number }).rows)
    }));
  } catch (error) {
    logger.error({ err: error, thresholdMs, limitCount }, 'Error obteniendo queries lentas');
    throw error;
  }
}

/**
 * Obtener queries más frecuentes
 * 
 * @param limitCount Número máximo de resultados (default: 20)
 */
export async function getMostFrequentQueries(
  limitCount: number = 20
): Promise<FrequentQuery[]> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      logger.warn('pg_stat_statements no está habilitado, retornando array vacío');
      return [];
    }

    const result = await db().execute(sql`
      SELECT * FROM get_most_frequent_queries(${limitCount})
    `);

    return result.rows.map((row: Record<string, unknown>) => ({
      query: (row as { query: string }).query,
      calls: Number((row as { calls: string | number }).calls),
      totalExecTime: Number((row as { total_exec_time: string | number }).total_exec_time),
      meanExecTime: Number((row as { mean_exec_time: string | number }).mean_exec_time),
      rows: Number((row as { rows: string | number }).rows)
    }));
  } catch (error) {
    logger.error({ err: error, limitCount }, 'Error obteniendo queries frecuentes');
    throw error;
  }
}

/**
 * Obtener queries por tiempo total consumido
 * 
 * @param limitCount Número máximo de resultados (default: 20)
 */
export async function getQueriesByTotalTime(
  limitCount: number = 20
): Promise<QueryByTotalTime[]> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      logger.warn('pg_stat_statements no está habilitado, retornando array vacío');
      return [];
    }

    const result = await db().execute(sql`
      SELECT * FROM get_queries_by_total_time(${limitCount})
    `);

    return result.rows.map((row: Record<string, unknown>) => ({
      query: (row as { query: string }).query,
      calls: Number((row as { calls: string | number }).calls),
      totalExecTime: Number((row as { total_exec_time: string | number }).total_exec_time),
      meanExecTime: Number((row as { mean_exec_time: string | number }).mean_exec_time),
      percentageTotalTime: Number((row as { percentage_total_time: string | number }).percentage_total_time),
      rows: Number((row as { rows: string | number }).rows)
    }));
  } catch (error) {
    logger.error({ err: error, limitCount }, 'Error obteniendo queries por tiempo total');
    throw error;
  }
}

/**
 * Resetear estadísticas de pg_stat_statements
 * 
 * Advertencia: Solo usar en desarrollo o cuando se necesite reiniciar el monitoreo
 */
export async function resetPgStatStatements(): Promise<void> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      throw new Error('pg_stat_statements no está habilitado');
    }

    await db().execute(sql`SELECT reset_pg_stat_statements()`);
    logger.info('Estadísticas de pg_stat_statements reseteadas');
  } catch (error) {
    logger.error({ err: error }, 'Error reseteando pg_stat_statements');
    throw error;
  }
}

/**
 * Obtener resumen de estadísticas de performance
 */
export async function getPerformanceSummary(): Promise<{
  enabled: boolean;
  totalQueries: number;
  totalTime: number;
  avgQueryTime: number;
  slowQueriesCount: number;
}> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      return {
        enabled: false,
        totalQueries: 0,
        totalTime: 0,
        avgQueryTime: 0,
        slowQueriesCount: 0
      };
    }

    const summary = await db().execute(sql`
      SELECT 
        COUNT(*) as total_queries,
        COALESCE(SUM(total_exec_time), 0) as total_time,
        COALESCE(AVG(mean_exec_time), 0) as avg_query_time,
        COUNT(*) FILTER (WHERE mean_exec_time >= 1000) as slow_queries_count
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%get_%'
    `);

    const row = summary.rows[0] as {
      total_queries: string | number;
      total_time: string | number;
      avg_query_time: string | number;
      slow_queries_count: string | number;
    };

    return {
      enabled: true,
      totalQueries: Number(row.total_queries),
      totalTime: Number(row.total_time),
      avgQueryTime: Number(row.avg_query_time),
      slowQueriesCount: Number(row.slow_queries_count)
    };
  } catch (error) {
    logger.error({ err: error }, 'Error obteniendo resumen de performance');
    throw error;
  }
}

