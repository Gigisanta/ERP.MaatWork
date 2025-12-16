#!/usr/bin/env tsx
/**
 * Script para verificar estado de migraciones y pg_stat_statements
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

// Cargar .env desde apps/api PRIMERO antes de cualquier import
const envPath = resolve(process.cwd(), 'apps/api/.env');
const envResult = config({ path: envPath });

if (envResult.error) {
  console.warn(`⚠️  No se pudo cargar .env desde ${envPath}:`, envResult.error.message);
}

// Verificar que DATABASE_URL esté cargada
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  console.log('Verificando variables de entorno...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NO DEFINIDA');
  process.exit(1);
}

console.log(`📝 Usando DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';

async function verifyMigrations() {
  console.log('🔍 Verificando migraciones aplicadas...\n');

  try {
    // Verificar migraciones aplicadas (estructura puede variar según versión de Drizzle)
    let migrations;
    try {
      migrations = await db().execute(sql`
        SELECT *
        FROM drizzle.__drizzle_migrations
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.log('Últimas migraciones aplicadas:');
      for (const migration of migrations.rows) {
        const m = migration as Record<string, unknown>;
        const hash = (m.hash as string) || 'N/A';
        console.log(`  ✓ ${hash.substring(0, 8)}...`);
      }
    } catch (error) {
      console.log('  ⚠️  No se pudo leer tabla de migraciones (puede ser normal)');
    }

    // Verificar índices de logs
    console.log('\n🔍 Verificando índices de logs...');
    const auditIndexes = await db().execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'audit_logs'
        AND indexname LIKE 'idx_audit_logs%'
    `);
    console.log(`  Índices en audit_logs: ${auditIndexes.rows.length}`);
    for (const idx of auditIndexes.rows) {
      console.log(`    - ${(idx as { indexname: string }).indexname}`);
    }

    const messageIndexes = await db().execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'message_log'
        AND indexname LIKE 'idx_message_log%'
    `);
    console.log(`  Índices en message_log: ${messageIndexes.rows.length}`);
    for (const idx of messageIndexes.rows) {
      console.log(`    - ${(idx as { indexname: string }).indexname}`);
    }

    // Verificar pg_stat_statements
    console.log('\n🔍 Verificando pg_stat_statements...');
    const pgStatExists = await db().execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'pg_stat_statements'
      ) as exists
    `);
    const exists = (pgStatExists.rows[0] as { exists: boolean }).exists;

    if (exists) {
      console.log('  ✅ pg_stat_statements está habilitado');

      // Verificar funciones helper
      const functions = await db().execute(sql`
        SELECT proname
        FROM pg_proc
        WHERE proname IN ('get_slow_queries', 'get_most_frequent_queries', 'get_queries_by_total_time', 'reset_pg_stat_statements')
        ORDER BY proname
      `);
      console.log(`  Funciones helper disponibles: ${functions.rows.length}/4`);
      for (const func of functions.rows) {
        console.log(`    - ${(func as { proname: string }).proname}`);
      }

      if (functions.rows.length < 4) {
        const missing = [
          'get_slow_queries',
          'get_most_frequent_queries',
          'get_queries_by_total_time',
          'reset_pg_stat_statements',
        ].filter(
          (name) =>
            !functions.rows.some((f: unknown) => (f as { proname: string }).proname === name)
        );
        if (missing.length > 0) {
          console.log(`  ⚠️  Funciones faltantes: ${missing.join(', ')}`);
        }
      }
    } else {
      console.log('  ⚠️  pg_stat_statements NO está habilitado');
      console.log('  Requiere:');
      console.log('    1. Agregar a shared_preload_libraries en postgresql.conf');
      console.log('    2. Reiniciar PostgreSQL');
      console.log('    3. Ejecutar: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    }

    // Verificar funciones de particionamiento
    console.log('\n🔍 Verificando funciones de particionamiento...');
    const partitionFunctions = await db().execute(sql`
      SELECT proname
      FROM pg_proc
      WHERE proname IN (
        'create_monthly_partition',
        'create_quarterly_partition',
        'create_partitions_for_range',
        'create_future_partitions',
        'list_table_partitions',
        'drop_old_partition'
      )
      ORDER BY proname
    `);
    console.log(`  Funciones de particionamiento: ${partitionFunctions.rows.length}/6`);
    for (const func of partitionFunctions.rows) {
      console.log(`    - ${(func as { proname: string }).proname}`);
    }

    if (partitionFunctions.rows.length < 6) {
      const missing = [
        'create_monthly_partition',
        'create_quarterly_partition',
        'create_partitions_for_range',
        'create_future_partitions',
        'list_table_partitions',
        'drop_old_partition',
      ].filter(
        (name) =>
          !partitionFunctions.rows.some((f: unknown) => (f as { proname: string }).proname === name)
      );
      if (missing.length > 0) {
        console.log(`  ⚠️  Funciones faltantes: ${missing.join(', ')}`);
      }
    }

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
