#!/usr/bin/env tsx
/**
 * Script para Verificar Salud de la Base de Datos
 * 
 * Verifica múltiples aspectos de la salud de la base de datos:
 * - Conexión y versión de PostgreSQL
 * - Estado de extensiones críticas
 * - Estadísticas de tablas e índices
 * - Queries lentas
 * - Estado de mantenimiento
 * - Uso de espacio
 * 
 * Uso:
 *   pnpm tsx scripts/check-db-health.ts
 */

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';
import pino from 'pino';
import { getPerformanceSummary, isPgStatStatementsEnabled } from '../apps/api/src/utils/pg-stat-statements.js';
import { getMaintenanceStats } from '../apps/api/src/jobs/maintenance.js';

const logger = pino({ name: 'check-db-health' });

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Verificar conexión y versión de PostgreSQL
 */
async function checkConnection(): Promise<HealthCheck> {
  try {
    const result = await db().execute(sql`
      SELECT version() as version
    `);
    const version = (result.rows[0] as { version: string }).version;
    
    return {
      name: 'Conexión a PostgreSQL',
      status: 'ok',
      message: 'Conexión exitosa',
      details: { version }
    };
  } catch (error) {
    return {
      name: 'Conexión a PostgreSQL',
      status: 'error',
      message: 'Error de conexión',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Verificar extensiones críticas
 */
async function checkExtensions(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  // Verificar pg_stat_statements
  const pgStatEnabled = await isPgStatStatementsEnabled();
  checks.push({
    name: 'pg_stat_statements',
    status: pgStatEnabled ? 'ok' : 'warning',
    message: pgStatEnabled 
      ? 'Extensión habilitada' 
      : 'Extensión no habilitada (requiere shared_preload_libraries y reinicio)'
  });

  // Verificar otras extensiones útiles
  const extensions = await db().execute(sql`
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname IN ('pg_trgm', 'uuid-ossp')
    ORDER BY extname
  `);

  const extensionNames = extensions.rows.map((row: unknown) => 
    (row as { extname: string }).extname
  );

  if (!extensionNames.includes('pg_trgm')) {
    checks.push({
      name: 'pg_trgm',
      status: 'warning',
      message: 'Extensión pg_trgm no encontrada (necesaria para búsquedas de texto)'
    });
  }

  return checks;
}

/**
 * Verificar estado de tablas e índices
 */
async function checkTablesAndIndexes(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Obtener estadísticas de tablas
  const tableStats = await db().execute(sql`
    SELECT 
      schemaname,
      tablename,
      n_live_tup,
      n_dead_tup,
      CASE 
        WHEN n_live_tup > 0 THEN 
          (n_dead_tup::float / n_live_tup::float * 100)
        ELSE 0
      END as dead_tuple_percentage,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > 1000
    ORDER BY n_dead_tup DESC
    LIMIT 10
  `);

  if (tableStats.rows.length > 0) {
    const problematicTables = tableStats.rows.filter((row: unknown) => {
      const r = row as { dead_tuple_percentage: number };
      return r.dead_tuple_percentage > 10;
    });

    if (problematicTables.length > 0) {
      checks.push({
        name: 'Tablas con dead tuples',
        status: 'warning',
        message: `${problematicTables.length} tabla(s) con >10% dead tuples`,
        details: {
          tables: problematicTables.map((row: unknown) => {
            const r = row as {
              tablename: string;
              n_dead_tup: number;
              dead_tuple_percentage: number;
            };
            return {
              table: r.tablename,
              deadTuples: r.n_dead_tup,
              percentage: r.dead_tuple_percentage.toFixed(2)
            };
          })
        }
      });
    }
  }

  // Verificar índices no usados
  const unusedIndexes = await db().execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND pg_relation_size(indexrelid) > 1048576  -- > 1MB
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 10
  `);

  if (unusedIndexes.rows.length > 0) {
    checks.push({
      name: 'Índices no usados',
      status: 'warning',
      message: `${unusedIndexes.rows.length} índice(s) no usado(s) (>1MB)`,
      details: {
        indexes: unusedIndexes.rows.map((row: unknown) => {
          const r = row as { indexname: string; size: string };
          return { index: r.indexname, size: r.size };
        })
      }
    });
  }

  return checks;
}

/**
 * Verificar queries lentas
 */
async function checkSlowQueries(): Promise<HealthCheck> {
  try {
    const enabled = await isPgStatStatementsEnabled();
    if (!enabled) {
      return {
        name: 'Queries lentas',
        status: 'warning',
        message: 'pg_stat_statements no habilitado, no se pueden verificar queries lentas'
      };
    }

    const summary = await getPerformanceSummary();
    
    if (summary.slowQueriesCount > 0) {
      return {
        name: 'Queries lentas',
        status: 'warning',
        message: `${summary.slowQueriesCount} query(s) lenta(s) detectada(s)`,
        details: {
          slowQueriesCount: summary.slowQueriesCount,
          avgQueryTime: summary.avgQueryTime.toFixed(2) + 'ms',
          totalQueries: summary.totalQueries
        }
      };
    }

    return {
      name: 'Queries lentas',
      status: 'ok',
      message: 'No se detectaron queries lentas',
      details: {
        avgQueryTime: summary.avgQueryTime.toFixed(2) + 'ms',
        totalQueries: summary.totalQueries
      }
    };
  } catch (error) {
    return {
      name: 'Queries lentas',
      status: 'error',
      message: 'Error verificando queries lentas',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Verificar estado de mantenimiento
 */
async function checkMaintenance(): Promise<HealthCheck> {
  try {
    const stats = await getMaintenanceStats();
    
    const needsVacuum = stats.tablesNeedingVacuum.length;
    const needsReindex = stats.indexesNeedingReindex.length;

    if (needsVacuum > 0 || needsReindex > 0) {
      return {
        name: 'Mantenimiento',
        status: 'warning',
        message: `Se requiere mantenimiento: ${needsVacuum} tabla(s) necesitan VACUUM, ${needsReindex} índice(s) necesitan REINDEX`,
        details: {
          tablesNeedingVacuum: needsVacuum,
          indexesNeedingReindex: needsReindex
        }
      };
    }

    return {
      name: 'Mantenimiento',
      status: 'ok',
      message: 'No se requiere mantenimiento inmediato'
    };
  } catch (error) {
    return {
      name: 'Mantenimiento',
      status: 'error',
      message: 'Error verificando mantenimiento',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Verificar uso de espacio
 */
async function checkDiskUsage(): Promise<HealthCheck> {
  try {
    const usage = await db().execute(sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as tables_size,
        pg_size_pretty(SUM(pg_relation_size(schemaname||'.'||tablename))) as data_size,
        pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))) as indexes_size
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const row = usage.rows[0] as {
      database_size: string;
      tables_size: string;
      data_size: string;
      indexes_size: string;
    };

    return {
      name: 'Uso de espacio',
      status: 'ok',
      message: 'Información de uso de espacio',
      details: {
        databaseSize: row.database_size,
        tablesSize: row.tables_size,
        dataSize: row.data_size,
        indexesSize: row.indexes_size
      }
    };
  } catch (error) {
    return {
      name: 'Uso de espacio',
      status: 'error',
      message: 'Error verificando uso de espacio',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  logger.info('🔍 Iniciando verificación de salud de la base de datos...');

  const checks: HealthCheck[] = [];

  // 1. Verificar conexión
  checks.push(await checkConnection());

  // 2. Verificar extensiones
  checks.push(...await checkExtensions());

  // 3. Verificar tablas e índices
  checks.push(...await checkTablesAndIndexes());

  // 4. Verificar queries lentas
  checks.push(await checkSlowQueries());

  // 5. Verificar mantenimiento
  checks.push(await checkMaintenance());

  // 6. Verificar uso de espacio
  checks.push(await checkDiskUsage());

  // Generar reporte
  console.log('\n========================================');
  console.log('REPORTE DE SALUD DE BASE DE DATOS');
  console.log('========================================\n');

  const okChecks = checks.filter(c => c.status === 'ok');
  const warningChecks = checks.filter(c => c.status === 'warning');
  const errorChecks = checks.filter(c => c.status === 'error');

  // Mostrar checks OK
  if (okChecks.length > 0) {
    console.log('✅ CHECKS OK:\n');
    for (const check of okChecks) {
      console.log(`  ✓ ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`    Detalles: ${JSON.stringify(check.details, null, 2)}`);
      }
    }
    console.log('');
  }

  // Mostrar warnings
  if (warningChecks.length > 0) {
    console.log('⚠️  ADVERTENCIAS:\n');
    for (const check of warningChecks) {
      console.log(`  ⚠ ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`    Detalles: ${JSON.stringify(check.details, null, 2)}`);
      }
    }
    console.log('');
  }

  // Mostrar errores
  if (errorChecks.length > 0) {
    console.log('❌ ERRORES:\n');
    for (const check of errorChecks) {
      console.log(`  ✗ ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`    Detalles: ${JSON.stringify(check.details, null, 2)}`);
      }
    }
    console.log('');
  }

  // Resumen
  console.log('========================================');
  console.log('RESUMEN');
  console.log('========================================\n');
  console.log(`Total de checks: ${checks.length}`);
  console.log(`✅ OK: ${okChecks.length}`);
  console.log(`⚠️  Warnings: ${warningChecks.length}`);
  console.log(`❌ Errores: ${errorChecks.length}\n`);

  if (errorChecks.length > 0) {
    console.log('❌ La base de datos tiene errores que requieren atención inmediata.\n');
    process.exit(1);
  } else if (warningChecks.length > 0) {
    console.log('⚠️  La base de datos tiene advertencias que deberían revisarse.\n');
    process.exit(0);
  } else {
    console.log('✅ La base de datos está en buen estado.\n');
    process.exit(0);
  }
}

// Ejecutar
main()
  .catch((error) => {
    logger.error({ error }, 'Error en verificación de salud');
    console.error('\n❌ Error ejecutando verificación de salud:', error);
    process.exit(1);
  });

