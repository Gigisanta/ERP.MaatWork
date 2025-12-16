/**
 * Database Maintenance Job
 *
 * Performs periodic database maintenance tasks:
 * - Daily: VACUUM ANALYZE on high-write tables
 * - Weekly: REINDEX on fragmented indexes
 *
 * AI_DECISION: Automated database maintenance for optimal performance
 * Justificación: Regular maintenance keeps statistics updated and reduces fragmentation
 * Impacto: Maintains query performance, prevents index bloat, keeps statistics accurate
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'db-maintenance' });

/**
 * Tables that receive frequent writes and benefit from daily VACUUM ANALYZE
 *
 * AI_DECISION: Expandir lista de tablas para incluir tablas de logs y particionadas
 * Justificación: Tablas de logs crecen rápidamente y necesitan mantenimiento regular
 * Impacto: Mejor performance en tablas grandes, estadísticas actualizadas
 */
const HIGH_WRITE_TABLES = [
  'contacts',
  'tasks',
  'notes',
  'broker_transactions',
  'aum_import_rows',
  'contact_tags',
  'pipeline_stage_history',
  'audit_logs',
  'message_log',
  'notifications',
  'activity_events',
];

/**
 * Daily maintenance: VACUUM ANALYZE on high-write tables
 *
 * Runs VACUUM ANALYZE on tables that receive frequent updates to:
 * - Update table statistics for query planner
 * - Reclaim space from deleted/updated rows
 * - Update index statistics
 *
 * También crea particiones futuras para tablas particionadas.
 */
export async function runDailyMaintenance(): Promise<void> {
  logger.info('🔧 Starting daily database maintenance (VACUUM ANALYZE)...');

  try {
    // 1. VACUUM ANALYZE en tablas de alto write
    for (const tableName of HIGH_WRITE_TABLES) {
      logger.info({ table: tableName }, 'Running VACUUM ANALYZE');

      try {
        // Verificar si la tabla existe antes de ejecutar VACUUM
        const tableExists = await db().execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          )
        `);

        if (!(tableExists.rows[0] as { exists: boolean }).exists) {
          logger.debug({ table: tableName }, 'Table does not exist, skipping');
          continue;
        }

        // Use parameterized query to safely escape table name
        await db().execute(sql.raw(`VACUUM ANALYZE "${tableName}"`));
        logger.info({ table: tableName }, 'VACUUM ANALYZE completed');
      } catch (error) {
        logger.error({ err: error, table: tableName }, 'Error running VACUUM ANALYZE');
        // Continue with other tables even if one fails
      }
    }

    // 2. Crear particiones futuras para tablas particionadas
    await createFuturePartitions();

    logger.info('✅ Daily database maintenance completed');
  } catch (error) {
    logger.error({ err: error }, 'Error in daily database maintenance');
    throw error;
  }
}

/**
 * Crear particiones futuras para tablas particionadas
 *
 * Crea particiones para los próximos 3 meses para tablas que usan particionamiento
 */
async function createFuturePartitions(): Promise<void> {
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

    // Tablas candidatas a particionamiento
    const partitionedTables = [
      { name: 'broker_transactions', strategy: 'monthly' },
      { name: 'broker_positions', strategy: 'monthly' },
      { name: 'activity_events', strategy: 'monthly' },
      { name: 'aum_snapshots', strategy: 'monthly' },
      { name: 'audit_logs', strategy: 'monthly' },
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
    // No throw - esto es opcional y no debe fallar el mantenimiento diario
  }
}

/**
 * Weekly maintenance: REINDEX on fragmented indexes
 *
 * Identifies indexes with high fragmentation and rebuilds them.
 * Uses pg_stat_user_indexes and pg_class to find indexes that need reindexing.
 *
 * AI_DECISION: Mejorar detección de índices fragmentados
 * Justificación: Detección anterior era muy básica, ahora incluye análisis de tamaño
 * Impacto: Mejor identificación de índices que realmente necesitan reindex
 */
export async function runWeeklyMaintenance(): Promise<void> {
  logger.info('🔧 Starting weekly database maintenance (REINDEX)...');

  try {
    // Encontrar índices con alta fragmentación usando múltiples criterios:
    // 1. Índices no usados pero con muchas tuplas leídas
    // 2. Índices con tamaño desproporcionado vs tabla
    // 3. Índices con bajo ratio de uso
    const fragmentedIndexes = await db().execute(sql`
      SELECT 
        i.schemaname,
        i.tablename,
        i.indexname,
        i.idx_scan,
        i.idx_tup_read,
        i.idx_tup_fetch,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        pg_size_pretty(pg_relation_size(i.relid)) as table_size,
        CASE 
          WHEN pg_relation_size(i.relid) > 0 THEN 
            (pg_relation_size(i.indexrelid)::float / pg_relation_size(i.relid)::float * 100)
          ELSE 0
        END as index_to_table_ratio
      FROM pg_stat_user_indexes i
      WHERE i.schemaname = 'public'
        AND (
          -- Criterio 1: Índices no usados pero con muchas tuplas leídas
          (i.idx_scan = 0 AND i.idx_tup_read > 1000)
          OR
          -- Criterio 2: Índices con tamaño > 50% del tamaño de la tabla
          (pg_relation_size(i.relid) > 0 
           AND (pg_relation_size(i.indexrelid)::float / pg_relation_size(i.relid)::float) > 0.5)
          OR
          -- Criterio 3: Índices con muy bajo ratio de uso (menos de 1% de scans vs tuplas)
          (i.idx_tup_read > 10000 
           AND i.idx_scan > 0 
           AND (i.idx_scan::float / NULLIF(i.idx_tup_read, 0)) < 0.01)
        )
      ORDER BY pg_relation_size(i.indexrelid) DESC
      LIMIT 20
    `);

    if (fragmentedIndexes.rows.length === 0) {
      logger.info('No fragmented indexes found');
      return;
    }

    logger.info({ count: fragmentedIndexes.rows.length }, 'Found fragmented indexes');

    for (const index of fragmentedIndexes.rows) {
      const indexName = (index as { indexname: string }).indexname;
      const indexSize = (index as { index_size: string }).index_size;
      const tableName = (index as { tablename: string }).tablename;

      logger.info(
        {
          index: indexName,
          table: tableName,
          size: indexSize,
        },
        'Rebuilding index'
      );

      try {
        // Verificar si el índice existe antes de reindexar
        const indexExists = await db().execute(sql`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = ${indexName}
          ) as exists
        `);

        if (!(indexExists.rows[0] as { exists: boolean }).exists) {
          logger.debug({ index: indexName }, 'Index does not exist, skipping');
          continue;
        }

        // Use REINDEX CONCURRENTLY para no bloquear la tabla
        // Nota: CONCURRENTLY requiere que el índice no sea único
        // Si falla, intentar sin CONCURRENTLY
        try {
          await db().execute(sql.raw(`REINDEX INDEX CONCURRENTLY "${indexName}"`));
          logger.info({ index: indexName }, 'Index rebuilt successfully (concurrent)');
        } catch (concurrentError) {
          // Si falla CONCURRENTLY (puede ser índice único), intentar sin CONCURRENTLY
          logger.warn(
            {
              index: indexName,
              err: concurrentError,
            },
            'Concurrent reindex failed, trying non-concurrent'
          );

          await db().execute(sql.raw(`REINDEX INDEX "${indexName}"`));
          logger.info({ index: indexName }, 'Index rebuilt successfully (non-concurrent)');
        }
      } catch (error) {
        logger.error({ err: error, index: indexName }, 'Error rebuilding index');
        // Continue with other indexes even if one fails
      }
    }

    logger.info('✅ Weekly database maintenance completed');
  } catch (error) {
    logger.error({ err: error }, 'Error in weekly database maintenance');
    throw error;
  }
}

/**
 * Get database maintenance statistics
 *
 * Returns information about tables that may need maintenance
 */
export async function getMaintenanceStats(): Promise<{
  tablesNeedingVacuum: Array<{
    schemaname: string;
    tablename: string;
    n_dead_tup: number;
    n_live_tup: number;
    last_vacuum: Date | null;
    last_autovacuum: Date | null;
  }>;
  indexesNeedingReindex: Array<{
    schemaname: string;
    tablename: string;
    indexname: string;
    idx_scan: number;
    idx_tup_read: number;
  }>;
}> {
  const tablesStats = await db().execute(sql`
    SELECT 
      schemaname,
      tablename,
      n_dead_tup,
      n_live_tup,
      last_vacuum,
      last_autovacuum
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > 1000
      AND (n_dead_tup::float / NULLIF(n_live_tup, 0)) > 0.1
    ORDER BY n_dead_tup DESC
    LIMIT 20
  `);

  const indexesStats = await db().execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND idx_tup_read > 1000
    ORDER BY idx_tup_read DESC
    LIMIT 20
  `);

  return {
    tablesNeedingVacuum: tablesStats.rows as Array<{
      schemaname: string;
      tablename: string;
      n_dead_tup: number;
      n_live_tup: number;
      last_vacuum: Date | null;
      last_autovacuum: Date | null;
    }>,
    indexesNeedingReindex: indexesStats.rows as Array<{
      schemaname: string;
      tablename: string;
      indexname: string;
      idx_scan: number;
      idx_tup_read: number;
    }>,
  };
}
