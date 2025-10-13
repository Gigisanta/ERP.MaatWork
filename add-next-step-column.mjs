// Script para agregar la columna next_step manualmente
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/CRM'
});

async function addNextStepColumn() {
  try {
    console.log('🔧 Agregando columna next_step a la tabla contacts...');
    
    await pool.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS next_step text;
    `);
    
    console.log('✅ Columna next_step agregada exitosamente');
    
    // Verificar que se agregó
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'next_step';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verificación exitosa: columna next_step existe');
    } else {
      console.log('❌ Error: columna next_step no se encontró');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addNextStepColumn();
