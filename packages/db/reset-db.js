import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Cargar .env
const rootDir = resolve(import.meta.dirname, '../..');
const envLocalPath = resolve(rootDir, '.env.local');
const envPath = resolve(rootDir, '.env');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🗑️  Eliminando todas las tablas...\n');

    // Obtener todas las tablas del schema público
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
    `);

    if (tables.rows.length > 0) {
      // Eliminar cada tabla individualmente con CASCADE para manejar dependencias
      for (const row of tables.rows) {
        try {
          await client.query(`DROP TABLE IF EXISTS "public"."${row.tablename}" CASCADE`);
          console.log(`✓ Tabla "${row.tablename}" eliminada`);
        } catch (error) {
          // Si falla, intentar sin el schema explícito
          try {
            await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
            console.log(`✓ Tabla "${row.tablename}" eliminada`);
          } catch (err2) {
            console.warn(`⚠️  No se pudo eliminar "${row.tablename}": ${err2.message}`);
          }
        }
      }
      console.log(`\n✓ ${tables.rows.length} tablas procesadas`);
    } else {
      console.log('ℹ️  No hay tablas para eliminar');
    }

    // Eliminar también el registro de migraciones de Drizzle si existe
    try {
      await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
      console.log('✓ Schema drizzle eliminado (incluye registro de migraciones)');
    } catch (error) {
      // El schema puede no existir
      if (!error.message.includes('does not exist')) {
        console.warn('⚠️  Advertencia al eliminar schema drizzle:', error.message);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Base de datos limpiada exitosamente\n');

    // Ahora aplicar todas las migraciones desde cero
    console.log('🔄 Aplicando todas las migraciones desde cero...\n');

    const migrationsFolder = resolve(import.meta.dirname, './migrations');
    const dbConnection = drizzle(pool);

    await migrate(dbConnection, { migrationsFolder });
    console.log('\n✅ Migraciones aplicadas exitosamente!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
