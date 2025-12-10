import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Cargar .env
const rootDir = resolve(import.meta.dirname, '../..');
const envLocalPath = resolve(rootDir, '.env.local');
const envPath = resolve(rootDir, '.env');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTables() {
  try {
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n📊 Tablas en la base de datos: ${tables.rows.length}\n`);
    tables.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.tablename}`);
    });

    if (tables.rows.length === 0) {
      console.log('\n✅ La base de datos está vacía - lista para aplicar migraciones');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
