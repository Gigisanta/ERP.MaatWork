import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync, rmSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Cargar .env - primero intentar desde packages/db/.env, luego raíz
const dbEnvPath = resolve(import.meta.dirname, '.env');
const rootDir = resolve(import.meta.dirname, '../..');
const envLocalPath = resolve(rootDir, '.env.local');
const envPath = resolve(rootDir, '.env');

// Cargar .env en orden de prioridad
if (existsSync(dbEnvPath)) {
  config({ path: dbEnvPath });
} else if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

const migrationsDir = resolve(import.meta.dirname, './migrations');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fullReset() {
  try {
    console.log('🔄 Reset completo de base de datos y migraciones\n');
    
    // Paso 1: Limpiar migraciones existentes
    console.log('1️⃣ Limpiando migraciones existentes...\n');
    if (existsSync(migrationsDir)) {
      // Eliminar todos los archivos .sql
      const files = readdirSync(migrationsDir);
      for (const file of files) {
        if (file.endsWith('.sql')) {
          unlinkSync(resolve(migrationsDir, file));
          console.log(`   ✓ Eliminado: ${file}`);
        }
      }
      
      // Limpiar meta y recrear journal vacío
      const metaDir = resolve(migrationsDir, 'meta');
      if (existsSync(metaDir)) {
        rmSync(metaDir, { recursive: true, force: true });
      }
      mkdirSync(metaDir, { recursive: true });
      
      writeFileSync(
        resolve(metaDir, '_journal.json'),
        JSON.stringify({
          version: '7',
          dialect: 'postgresql',
          entries: []
        }, null, 2)
      );
      console.log('   ✓ Journal vaciado (entries: [])');
    }
    
    // Paso 2: Resetear base de datos
    console.log('\n2️⃣ Reseteando base de datos...\n');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Eliminar todas las tablas
      const tables = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
      `);
      
      if (tables.rows.length > 0) {
        for (const row of tables.rows) {
          await client.query(`DROP TABLE IF EXISTS "public"."${row.tablename}" CASCADE`);
          console.log(`   ✓ Tabla "${row.tablename}" eliminada`);
        }
      } else {
        console.log('   ℹ️  No hay tablas para eliminar');
      }
      
      // Eliminar schema drizzle
      await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
      console.log('   ✓ Schema drizzle eliminado');
      
      await client.query('COMMIT');
      console.log('   ✅ Base de datos reseteada\n');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    // Paso 3: Regenerar migraciones desde el schema
    console.log('3️⃣ Regenerando migraciones desde el schema actual...\n');
    execSync('pnpm generate', { 
      cwd: import.meta.dirname, 
      stdio: 'inherit',
      env: process.env
    });
    
    // Paso 4: Aplicar migraciones
    console.log('\n4️⃣ Aplicando migraciones...\n');
    const dbConnection = drizzle(pool);
    await migrate(dbConnection, { migrationsFolder: migrationsDir });
    console.log('   ✅ Migraciones aplicadas exitosamente\n');
    
    console.log('🎉 Reset completo finalizado!');
    console.log('   La base de datos está lista para usar.\n');
    
  } catch (error) {
    console.error('\n❌ Error durante el reset:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fullReset();

