const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function verificarTablas() {
  console.log('🔍 Verificando tablas existentes...\n');

  let databaseUrl = null;
  
  try {
    const envPath = path.join(__dirname, '../../apps/api/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1];
    }
  } catch (error) {
    console.log('❌ Error leyendo archivo .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Listar todas las tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Tablas encontradas (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verificar tablas específicas del sistema de comparación mensual
    const tablasNecesarias = [
      'maestro_cuentas',
      'staging_mensual', 
      'auditoria_cargas',
      'diff_detalle',
      'snapshots_maestro',
      'asignaciones_asesor'
    ];

    console.log('\n🔍 Verificando tablas del sistema de comparación mensual:');
    for (const tabla of tablasNecesarias) {
      const exists = result.rows.some(row => row.table_name === tabla);
      if (exists) {
        console.log(`  ✅ ${tabla}`);
      } else {
        console.log(`  ❌ ${tabla} - FALTANTE`);
      }
    }

    // Verificar si hay migraciones pendientes
    console.log('\n📁 Verificando migraciones disponibles...');
    const migrationsPath = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsPath)) {
      const migrations = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`📋 Migraciones encontradas (${migrations.length}):`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
    } else {
      console.log('❌ Directorio de migraciones no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verificarTablas();


