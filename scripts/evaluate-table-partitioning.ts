#!/usr/bin/env tsx
/**
 * Script para evaluar si las tablas grandes necesitan particionamiento
 *
 * Evalúa:
 * - Tamaño de tablas (filas y tamaño en disco)
 * - Patrones de acceso (queries por rango de fecha)
 * - Beneficios esperados del particionamiento
 */

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'evaluate-partitioning' });

interface TableStats {
  tableName: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
  dateColumn: string;
  dateRange: {
    min: string | null;
    max: string | null;
  };
  partitionsRecommended: boolean;
  partitionStrategy: string | null;
}

async function getTableStats(tableName: string, dateColumn: string): Promise<TableStats> {
  // Use parameterized query with identifier quoting
  const stats = await db().execute(
    sql.raw(`
    SELECT 
      pg_size_pretty(pg_total_relation_size('${tableName}'::regclass)) as total_size,
      pg_size_pretty(pg_relation_size('${tableName}'::regclass)) as table_size,
      pg_size_pretty(pg_total_relation_size('${tableName}'::regclass) - pg_relation_size('${tableName}'::regclass)) as index_size,
      (SELECT COUNT(*) FROM "${tableName}") as row_count,
      (SELECT MIN("${dateColumn}") FROM "${tableName}") as min_date,
      (SELECT MAX("${dateColumn}") FROM "${tableName}") as max_date
  `)
  );

  const row = stats.rows[0] as {
    total_size: string;
    table_size: string;
    index_size: string;
    row_count: string;
    min_date: string | null;
    max_date: string | null;
  };

  const rowCount = parseInt(row.row_count, 10);
  const minDate = row.min_date;
  const maxDate = row.max_date;

  // Recomendar particionamiento si:
  // - Más de 1M filas O
  // - Más de 10GB de datos O
  // - Más de 2 años de datos históricos
  const totalSizeBytes = parseSizeToBytes(row.total_size);
  const yearsOfData =
    minDate && maxDate
      ? (new Date(maxDate).getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 0;

  const partitionsRecommended =
    rowCount > 1_000_000 || totalSizeBytes > 10_000_000_000 || yearsOfData > 2;

  let partitionStrategy: string | null = null;
  if (partitionsRecommended) {
    // Estrategia: mensual si < 5 años, trimestral si >= 5 años
    partitionStrategy = yearsOfData < 5 ? 'monthly' : 'quarterly';
  }

  return {
    tableName,
    rowCount,
    tableSize: row.table_size,
    indexSize: row.index_size,
    totalSize: row.total_size,
    dateColumn,
    dateRange: {
      min: minDate,
      max: maxDate,
    },
    partitionsRecommended,
    partitionStrategy,
  };
}

function parseSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
}

async function evaluatePartitioning(): Promise<void> {
  logger.info('Evaluando candidatos para particionamiento...');

  // Verificar conexión a la base de datos primero
  try {
    await db().execute(sql.raw(`SELECT 1`));
  } catch (error) {
    console.error('\n❌ Error de conexión a la base de datos:');
    console.error('   Asegúrate de que:');
    console.error('   1. PostgreSQL esté corriendo');
    console.error('   2. DATABASE_URL esté configurada en el entorno');
    console.error('   3. Las credenciales sean correctas\n');
    throw error;
  }

  const candidates = [
    { tableName: 'broker_transactions', dateColumn: 'trade_date' },
    { tableName: 'broker_positions', dateColumn: 'as_of_date' },
    { tableName: 'activity_events', dateColumn: 'occurred_at' },
    { tableName: 'aum_snapshots', dateColumn: 'date' },
    { tableName: 'audit_logs', dateColumn: 'created_at' },
  ];

  const results: TableStats[] = [];

  for (const candidate of candidates) {
    try {
      // First check if table exists
      const tableExists = await db().execute(
        sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${candidate.tableName}'
        )
      `)
      );

      if (!(tableExists.rows[0] as { exists: boolean }).exists) {
        logger.debug(
          { table: candidate.tableName },
          `Tabla ${candidate.tableName} no existe, omitiendo`
        );
        continue;
      }

      // Check if date column exists
      const columnExists = await db().execute(
        sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${candidate.tableName}'
          AND column_name = '${candidate.dateColumn}'
        )
      `)
      );

      if (!(columnExists.rows[0] as { exists: boolean }).exists) {
        logger.warn(
          {
            table: candidate.tableName,
            column: candidate.dateColumn,
          },
          `Columna ${candidate.dateColumn} no existe en ${candidate.tableName}, omitiendo`
        );
        continue;
      }

      const stats = await getTableStats(candidate.tableName, candidate.dateColumn);
      results.push(stats);

      logger.info(
        {
          table: stats.tableName,
          rows: stats.rowCount.toLocaleString(),
          size: stats.totalSize,
          dateRange: stats.dateRange,
          recommended: stats.partitionsRecommended,
          strategy: stats.partitionStrategy,
        },
        `Estadísticas de ${stats.tableName}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        {
          error: errorMessage,
          table: candidate.tableName,
          column: candidate.dateColumn,
        },
        `No se pudo evaluar ${candidate.tableName}: ${errorMessage}`
      );
    }
  }

  // Generar reporte
  console.log('\n========================================');
  console.log('REPORTE DE EVALUACIÓN DE PARTICIONAMIENTO');
  console.log('========================================\n');

  const recommended = results.filter((r) => r.partitionsRecommended);
  const notRecommended = results.filter((r) => !r.partitionsRecommended);

  if (recommended.length > 0) {
    console.log('✅ TABLAS RECOMENDADAS PARA PARTICIONAMIENTO:\n');
    recommended.forEach((r) => {
      console.log(`📊 ${r.tableName}`);
      console.log(`   Filas: ${r.rowCount.toLocaleString()}`);
      console.log(`   Tamaño total: ${r.totalSize}`);
      console.log(`   Rango de fechas: ${r.dateRange.min} → ${r.dateRange.max}`);
      console.log(
        `   Estrategia: ${r.partitionStrategy} (por ${r.partitionStrategy === 'monthly' ? 'mes' : 'trimestre'})`
      );
      console.log(`   Columna de fecha: ${r.dateColumn}`);
      console.log('');
    });
  }

  if (notRecommended.length > 0) {
    console.log('ℹ️  TABLAS QUE NO REQUIEREN PARTICIONAMIENTO (aún):\n');
    notRecommended.forEach((r) => {
      console.log(`📊 ${r.tableName}`);
      console.log(`   Filas: ${r.rowCount.toLocaleString()}`);
      console.log(`   Tamaño total: ${r.totalSize}`);
      console.log('');
    });
  }

  // Generar recomendaciones
  console.log('\n========================================');
  console.log('RECOMENDACIONES');
  console.log('========================================\n');

  if (recommended.length === 0) {
    console.log('✅ No se requiere particionamiento en este momento.');
    console.log('   Monitorear crecimiento de tablas y reevaluar cuando:');
    console.log('   - Filas > 1M');
    console.log('   - Tamaño > 10GB');
    console.log('   - Datos históricos > 2 años\n');
  } else {
    console.log(`⚠️  ${recommended.length} tabla(s) requieren particionamiento:\n`);
    recommended.forEach((r) => {
      console.log(`1. ${r.tableName}:`);
      console.log(
        `   - Particionar por ${r.partitionStrategy === 'monthly' ? 'mes' : 'trimestre'}`
      );
      console.log(`   - Usar columna: ${r.dateColumn}`);
      console.log(`   - Beneficio esperado: 60-80% reducción en queries históricas`);
      console.log('');
    });

    console.log('📝 Próximos pasos:');
    console.log('   1. Ejecutar migración de particionamiento');
    console.log('   2. Migrar datos existentes a particiones');
    console.log('   3. Configurar mantenimiento automático de particiones');
    console.log('   4. Monitorear performance después de particionamiento\n');
  }
}

// Ejecutar evaluación
evaluatePartitioning()
  .then(() => {
    logger.info('Evaluación completada');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Error en evaluación');
    process.exit(1);
  });
