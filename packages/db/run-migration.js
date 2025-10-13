const { readFileSync } = require('fs');
const { resolve } = require('path');
const { Pool } = require('pg');

// Cargar variables de entorno desde el archivo .env
require('dotenv').config({ path: resolve(__dirname, '../../apps/api/.env') });

async function runMigration() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const client = await pool.connect();
  
  try {
    console.log('Ejecutando migración del sistema de comparación mensual...');
    
    const migrationPath = resolve(__dirname, 'migrations/0006_sistema_comparacion_mensual.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar que las tablas se crearon
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'maestro_cuentas', 'staging_mensual', 'asignaciones_asesor', 
        'auditoria_cargas', 'snapshots_maestro', 'diff_detalle'
      )
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
