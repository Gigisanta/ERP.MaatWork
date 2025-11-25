#!/usr/bin/env tsx
/**
 * Script para aplicar migraciones SQL directamente
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar .env desde apps/api
config({ path: resolve(process.cwd(), 'apps/api/.env') });

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';

async function applyMigration(fileName: string) {
  const filePath = join(process.cwd(), 'packages/db/migrations', fileName);
  console.log(`\n📄 Aplicando migración: ${fileName}`);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Dividir por statement-breakpoint
    const statements = content
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db().execute(sql.raw(statement));
      }
    }
    
    console.log(`  ✅ Migración ${fileName} aplicada exitosamente`);
  } catch (error) {
    console.error(`  ❌ Error aplicando ${fileName}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Aplicando migraciones SQL...\n');
  
  try {
    // Aplicar migraciones en orden
    await applyMigration('0029_table_partitioning_utilities.sql');
    await applyMigration('0030_add_log_indexes.sql');
    await applyMigration('0032_enable_pg_stat_statements.sql');
    
    console.log('\n✅ Todas las migraciones aplicadas exitosamente');
    
    // Verificar pg_stat_statements
    console.log('\n🔍 Verificando pg_stat_statements...');
    const pgStatExists = await db().execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'pg_stat_statements'
      ) as exists
    `);
    
    if ((pgStatExists.rows[0] as { exists: boolean }).exists) {
      console.log('  ✅ pg_stat_statements habilitado');
    } else {
      console.log('  ⚠️  pg_stat_statements requiere reinicio de PostgreSQL');
      console.log('  Verificar que shared_preload_libraries incluya pg_stat_statements');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

