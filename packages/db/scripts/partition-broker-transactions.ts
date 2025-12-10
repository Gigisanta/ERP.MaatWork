#!/usr/bin/env tsx
/**
 * Script para particionar broker_transactions
 *
 * AI_DECISION: Expandir particionamiento a broker_transactions usando scripts existentes
 * Justificación: broker_transactions crece rápidamente, particionamiento mejora performance de queries
 * Impacto: Mejor performance en queries históricas, mantenimiento más fácil de datos antiguos
 *
 * Uso:
 *   pnpm tsx packages/db/scripts/partition-broker-transactions.ts
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env');
const envLocalPath = join(process.cwd(), '.env.local');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function partitionBrokerTransactions() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔍 Verificando si broker_transactions ya está particionada...\n');

    // Verificar si ya está particionada
    const checkPartitioned = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = 'broker_transactions_partitioned'
      ) as exists;
    `);

    if (checkPartitioned.rows[0].exists) {
      console.log('⚠️  broker_transactions ya está particionada. Saltando...\n');
      await client.query('ROLLBACK');
      return;
    }

    // Verificar que la tabla existe
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = 'broker_transactions'
      ) as exists;
    `);

    if (!checkTable.rows[0].exists) {
      console.log('⚠️  Tabla broker_transactions no existe. Saltando...\n');
      await client.query('ROLLBACK');
      return;
    }

    console.log('📊 Creando tabla particionada broker_transactions_partitioned...\n');

    // Crear tabla particionada
    await client.query(`
      CREATE TABLE IF NOT EXISTS broker_transactions_partitioned (
        LIKE broker_transactions INCLUDING ALL
      ) PARTITION BY RANGE (trade_date);
    `);

    console.log('✅ Tabla particionada creada\n');

    // Crear índices en la tabla particionada
    console.log('📇 Creando índices...\n');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transactions_partitioned_trade_date 
      ON broker_transactions_partitioned (trade_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transactions_partitioned_instrument_id 
      ON broker_transactions_partitioned (instrument_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transactions_partitioned_portfolio_id 
      ON broker_transactions_partitioned (portfolio_id);
    `);

    console.log('✅ Índices creados\n');

    // Obtener rango de fechas de los datos existentes
    console.log('📅 Analizando datos existentes...\n');

    const dateRange = await client.query(`
      SELECT 
        MIN(trade_date) as min_date,
        MAX(trade_date) as max_date,
        COUNT(*) as total_count
      FROM broker_transactions;
    `);

    const minDate = dateRange.rows[0].min_date;
    const maxDate = dateRange.rows[0].max_date;
    const totalCount = parseInt(dateRange.rows[0].total_count || '0');

    if (!minDate || !maxDate || totalCount === 0) {
      console.log(
        '⚠️  No hay datos en broker_transactions. Creando particiones futuras solamente...\n'
      );
    } else {
      console.log(`   Rango de fechas: ${minDate} a ${maxDate}`);
      console.log(`   Total de registros: ${totalCount}\n`);
    }

    // Crear particiones mensuales desde min_date hasta max_date + 3 meses futuros
    console.log('🗓️  Creando particiones mensuales...\n');

    const startDate = minDate ? new Date(minDate) : new Date();
    const endDate = maxDate ? new Date(maxDate) : new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Agregar 3 meses futuros

    let partitionCount = 0;
    const currentDate = new Date(startDate);
    currentDate.setDate(1); // Primer día del mes

    while (currentDate <= endDate) {
      const partitionName = `broker_transactions_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const partitionStart = new Date(currentDate);
      const partitionEnd = new Date(currentDate);
      partitionEnd.setMonth(partitionEnd.getMonth() + 1);

      await client.query(
        `
        SELECT create_monthly_partition(
          'broker_transactions_partitioned',
          $1::date
        );
      `,
        [partitionStart]
      );

      console.log(
        `   ✓ Partición creada: ${partitionName} (${partitionStart.toISOString().split('T')[0]} a ${partitionEnd.toISOString().split('T')[0]})`
      );
      partitionCount++;

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log(`\n✅ ${partitionCount} particiones creadas\n`);

    // Migrar datos si existen
    if (totalCount > 0) {
      console.log(`📦 Migrando ${totalCount} registros a tabla particionada...\n`);

      await client.query(`
        INSERT INTO broker_transactions_partitioned
        SELECT * FROM broker_transactions
        ON CONFLICT DO NOTHING;
      `);

      // Verificar integridad
      const partitionedCount = await client.query(`
        SELECT COUNT(*) as count FROM broker_transactions_partitioned;
      `);

      const partitionedTotal = parseInt(partitionedCount.rows[0].count || '0');

      if (partitionedTotal !== totalCount) {
        throw new Error(
          `Error de integridad: broker_transactions tiene ${totalCount} registros pero broker_transactions_partitioned tiene ${partitionedTotal}`
        );
      }

      console.log(`✅ ${partitionedTotal} registros migrados exitosamente\n`);
    }

    // Renombrar tablas
    console.log('🔄 Renombrando tablas...\n');

    await client.query(`
      ALTER TABLE broker_transactions RENAME TO broker_transactions_old;
    `);

    await client.query(`
      ALTER TABLE broker_transactions_partitioned RENAME TO broker_transactions;
    `);

    console.log('✅ Tablas renombradas\n');

    // Crear función para mantener particiones futuras
    console.log('🔧 Configurando mantenimiento automático de particiones...\n');

    await client.query(`
      DO $$
      BEGIN
        -- Crear particiones futuras cada mes (3 meses adelante)
        PERFORM create_future_partitions('broker_transactions', 3, 'monthly');
      END $$;
    `);

    console.log('✅ Mantenimiento automático configurado\n');

    await client.query('COMMIT');

    console.log('🎉 Particionamiento de broker_transactions completado exitosamente!\n');
    console.log('📝 Nota: La tabla original se renombró a broker_transactions_old');
    console.log('   Puedes eliminarla después de verificar que todo funciona correctamente:\n');
    console.log('   DROP TABLE broker_transactions_old;\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      '\n❌ Error durante el particionamiento:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar
partitionBrokerTransactions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
