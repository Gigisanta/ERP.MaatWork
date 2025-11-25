#!/usr/bin/env tsx
/**
 * Script para Aplicar Particionamiento de Tablas de Forma Segura
 * 
 * Este script aplica particionamiento a tablas grandes de forma segura:
 * 1. Crea tabla particionada nueva
 * 2. Migra datos en batches
 * 3. Verifica integridad
 * 4. Intercambia tablas (requiere confirmación)
 * 5. Limpia tabla antigua
 * 
 * Uso:
 *   pnpm tsx scripts/partition-tables.ts --table broker_transactions --strategy monthly --date-column trade_date
 * 
 * Advertencia: Este script modifica la estructura de la base de datos.
 * Siempre hacer backup antes de ejecutar.
 */

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';
import pino from 'pino';
import { parseArgs } from 'node:util';

const logger = pino({ name: 'partition-tables' });

interface PartitionConfig {
  tableName: string;
  dateColumn: string;
  strategy: 'monthly' | 'quarterly';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Obtener argumentos de línea de comandos
 */
function getArgs(): PartitionConfig {
  const { values } = parseArgs({
    options: {
      table: { type: 'string', short: 't' },
      'date-column': { type: 'string', short: 'd' },
      strategy: { type: 'string', short: 's' },
      'start-date': { type: 'string' },
      'end-date': { type: 'string' }
    }
  });

  if (!values.table || !values['date-column']) {
    console.error('Uso: pnpm tsx scripts/partition-tables.ts --table TABLE_NAME --date-column COLUMN_NAME [--strategy monthly|quarterly] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]');
    process.exit(1);
  }

  return {
    tableName: values.table,
    dateColumn: values['date-column'],
    strategy: (values.strategy as 'monthly' | 'quarterly') || 'monthly',
    startDate: values['start-date'] ? new Date(values['start-date']) : undefined,
    endDate: values['end-date'] ? new Date(values['end-date']) : undefined
  };
}

/**
 * Verificar que la tabla existe y obtener información
 */
async function verifyTable(config: PartitionConfig): Promise<{
  exists: boolean;
  rowCount: number;
  dateRange: { min: Date | null; max: Date | null };
}> {
  logger.info({ table: config.tableName }, 'Verificando tabla...');

  // Verificar existencia
  const exists = await db().execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${config.tableName}
    ) as exists
  `);

  if (!(exists.rows[0] as { exists: boolean }).exists) {
    throw new Error(`Tabla ${config.tableName} no existe`);
  }

  // Verificar que la columna de fecha existe
  const columnExists = await db().execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${config.tableName}
      AND column_name = ${config.dateColumn}
    ) as exists
  `);

  if (!(columnExists.rows[0] as { exists: boolean }).exists) {
    throw new Error(`Columna ${config.dateColumn} no existe en ${config.tableName}`);
  }

  // Obtener conteo de filas y rango de fechas
  const stats = await db().execute(sql.raw(`
    SELECT 
      COUNT(*) as row_count,
      MIN("${config.dateColumn}") as min_date,
      MAX("${config.dateColumn}") as max_date
    FROM "${config.tableName}"
  `));

  const row = stats.rows[0] as {
    row_count: string;
    min_date: Date | string | null;
    max_date: Date | string | null;
  };

  return {
    exists: true,
    rowCount: parseInt(row.row_count, 10),
    dateRange: {
      min: row.min_date ? new Date(row.min_date) : null,
      max: row.max_date ? new Date(row.max_date) : null
    }
  };
}

/**
 * Crear tabla particionada
 */
async function createPartitionedTable(config: PartitionConfig): Promise<string> {
  const partitionedTableName = `${config.tableName}_partitioned`;
  
  logger.info({ table: partitionedTableName }, 'Creando tabla particionada...');

  // Crear tabla particionada usando LIKE para copiar estructura
  await db().execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "${partitionedTableName}" (
      LIKE "${config.tableName}" INCLUDING ALL
    ) PARTITION BY RANGE (${config.dateColumn})
  `));

  logger.info({ table: partitionedTableName }, 'Tabla particionada creada');
  return partitionedTableName;
}

/**
 * Crear particiones para un rango de fechas
 */
async function createPartitions(
  partitionedTableName: string,
  config: PartitionConfig,
  startDate: Date,
  endDate: Date
): Promise<void> {
  logger.info({ startDate, endDate }, 'Creando particiones...');

  // Verificar que existe la función de creación de particiones
  const functionExists = await db().execute(sql`
    SELECT EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = 'create_partitions_for_range'
    ) as exists
  `);

  if (!(functionExists.rows[0] as { exists: boolean }).exists) {
    throw new Error('Función create_partitions_for_range no existe. Ejecutar migración 0029 primero.');
  }

  // Crear particiones usando la función helper
  await db().execute(sql.raw(`
    SELECT create_partitions_for_range(
      '${partitionedTableName}',
      '${startDate.toISOString().split('T')[0]}'::date,
      '${endDate.toISOString().split('T')[0]}'::date,
      '${config.strategy}'
    )
  `));

  logger.info('Particiones creadas');
}

/**
 * Migrar datos en batches
 */
async function migrateData(
  sourceTable: string,
  targetTable: string,
  config: PartitionConfig,
  batchSize: number = 10000
): Promise<void> {
  logger.info({ sourceTable, targetTable, batchSize }, 'Iniciando migración de datos...');

  // Obtener conteo total
  const totalCount = await db().execute(sql.raw(`
    SELECT COUNT(*) as count FROM "${sourceTable}"
  `));
  const total = parseInt((totalCount.rows[0] as { count: string }).count, 10);

  logger.info({ total }, 'Total de filas a migrar');

  let migrated = 0;
  let offset = 0;

  while (offset < total) {
    // Migrar batch
    await db().execute(sql.raw(`
      INSERT INTO "${targetTable}"
      SELECT * FROM "${sourceTable}"
      ORDER BY "${config.dateColumn}"
      LIMIT ${batchSize} OFFSET ${offset}
    `));

    migrated += batchSize;
    offset += batchSize;

    logger.info({ migrated, total, progress: ((migrated / total) * 100).toFixed(2) + '%' }, 'Migración en progreso...');
  }

  logger.info({ total: migrated }, 'Migración completada');
}

/**
 * Verificar integridad de datos migrados
 */
async function verifyIntegrity(
  sourceTable: string,
  targetTable: string
): Promise<boolean> {
  logger.info('Verificando integridad...');

  const sourceCount = await db().execute(sql.raw(`
    SELECT COUNT(*) as count FROM "${sourceTable}"
  `));
  const sourceTotal = parseInt((sourceCount.rows[0] as { count: string }).count, 10);

  const targetCount = await db().execute(sql.raw(`
    SELECT COUNT(*) as count FROM "${targetTable}"
  `));
  const targetTotal = parseInt((targetCount.rows[0] as { count: string }).count, 10);

  if (sourceTotal !== targetTotal) {
    logger.error({ sourceTotal, targetTotal }, 'Integridad fallida: conteos no coinciden');
    return false;
  }

  logger.info({ count: sourceTotal }, 'Integridad verificada: conteos coinciden');
  return true;
}

/**
 * Intercambiar tablas (requiere downtime)
 */
async function swapTables(
  oldTable: string,
  newTable: string
): Promise<void> {
  logger.warn('⚠️  INTERCAMBIO DE TABLAS - Esto requiere downtime');
  logger.info({ oldTable, newTable }, 'Intercambiando tablas...');

  // Renombrar tabla antigua
  const backupTable = `${oldTable}_old_${Date.now()}`;
  await db().execute(sql.raw(`ALTER TABLE "${oldTable}" RENAME TO "${backupTable}"`));

  // Renombrar tabla nueva
  await db().execute(sql.raw(`ALTER TABLE "${newTable}" RENAME TO "${oldTable}"`));

  logger.info({ backupTable }, 'Tablas intercambiadas. Tabla antigua guardada como backup');
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  const config = getArgs();

  logger.info({ config }, 'Iniciando particionamiento...');

  try {
    // 1. Verificar tabla
    const tableInfo = await verifyTable(config);
    logger.info({ tableInfo }, 'Información de tabla');

    if (tableInfo.rowCount === 0) {
      logger.warn('Tabla vacía, no hay datos para migrar');
      return;
    }

    // 2. Determinar rango de fechas
    const startDate = config.startDate || tableInfo.dateRange.min || new Date();
    const endDate = config.endDate || tableInfo.dateRange.max || new Date();

    // 3. Crear tabla particionada
    const partitionedTableName = await createPartitionedTable(config);

    // 4. Crear particiones
    await createPartitions(partitionedTableName, config, startDate, endDate);

    // 5. Migrar datos
    await migrateData(config.tableName, partitionedTableName, config);

    // 6. Verificar integridad
    const integrityOk = await verifyIntegrity(config.tableName, partitionedTableName);
    if (!integrityOk) {
      logger.error('Integridad fallida. Abortando intercambio de tablas.');
      logger.info({ partitionedTable: partitionedTableName }, 'Tabla particionada creada pero no intercambiada. Revisar manualmente.');
      return;
    }

    // 7. Intercambiar tablas (requiere confirmación)
    logger.warn('⚠️  PRÓXIMO PASO: Intercambiar tablas');
    logger.info('Esto requiere downtime. ¿Continuar? (S/N)');
    // En producción, esto debería requerir confirmación interactiva
    // Por ahora, solo logueamos la advertencia
    
    logger.info('Para completar el proceso, ejecutar manualmente:');
    logger.info(`ALTER TABLE "${config.tableName}" RENAME TO "${config.tableName}_old"`);
    logger.info(`ALTER TABLE "${partitionedTableName}" RENAME TO "${config.tableName}"`);

    logger.info('✅ Particionamiento completado (pendiente intercambio de tablas)');

  } catch (error) {
    logger.error({ err: error }, 'Error en particionamiento');
    throw error;
  }
}

// Ejecutar
main()
  .then(() => {
    logger.info('Script completado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Error en script');
    process.exit(1);
  });

