const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateDesdeRaiz() {
  console.log('🔧 Migración del Sistema de Comparación Mensual\n');

  // Leer DATABASE_URL desde el archivo .env en la raíz del proyecto
  let databaseUrl = null;
  
  try {
    const envPath = path.join(__dirname, '../../apps/api/.env');
    console.log(`📁 Leyendo configuración desde: ${envPath}`);
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=(.+)/);
      if (match) {
        databaseUrl = match[1];
        console.log(`✅ DATABASE_URL encontrada: ${databaseUrl}`);
      }
    }
  } catch (error) {
    console.log('❌ Error leyendo archivo .env:', error.message);
  }

  if (!databaseUrl) {
    console.log('❌ DATABASE_URL no configurada');
    console.log('Por favor ejecuta: node scripts/verificar-postgres.js');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Verificar si ya existen los campos
    console.log('\n🔍 Verificando campos existentes...');

    // 1. Verificar ausentes_detectados en auditoria_cargas
    const checkAusentes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'auditoria_cargas' 
      AND column_name = 'ausentes_detectados'
    `);

    if (checkAusentes.rows.length === 0) {
      console.log('➕ Agregando campo ausentes_detectados a auditoria_cargas...');
      await client.query(`
        ALTER TABLE "auditoria_cargas" 
        ADD COLUMN "ausentes_detectados" integer DEFAULT 0 NOT NULL
      `);
      console.log('✅ Campo ausentes_detectados agregado');
    } else {
      console.log('✅ Campo ausentes_detectados ya existe');
    }

    // 2. Verificar requiere_confirmacion_asesor en diff_detalle
    const checkConfirmacion = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'diff_detalle' 
      AND column_name = 'requiere_confirmacion_asesor'
    `);

    if (checkConfirmacion.rows.length === 0) {
      console.log('➕ Agregando campo requiere_confirmacion_asesor a diff_detalle...');
      await client.query(`
        ALTER TABLE "diff_detalle" 
        ADD COLUMN "requiere_confirmacion_asesor" boolean DEFAULT false NOT NULL
      `);
      console.log('✅ Campo requiere_confirmacion_asesor agregado');
    } else {
      console.log('✅ Campo requiere_confirmacion_asesor ya existe');
    }

    // 3. Verificar si ya existe el índice
    const checkIndex = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname = 'idx_diff_detalle_confirmacion'
    `);

    if (checkIndex.rows.length === 0) {
      console.log('➕ Creando índice idx_diff_detalle_confirmacion...');
      await client.query(`
        CREATE INDEX "idx_diff_detalle_confirmacion" 
        ON "diff_detalle" ("requiere_confirmacion_asesor")
      `);
      console.log('✅ Índice creado');
    } else {
      console.log('✅ Índice ya existe');
    }

    // 4. Hacer campos opcionales en diff_detalle para ausentes
    console.log('➕ Haciendo campos opcionales en diff_detalle...');
    await client.query(`
      ALTER TABLE "diff_detalle" 
      ALTER COLUMN "comitente_nuevo" DROP NOT NULL,
      ALTER COLUMN "cuotapartista_nuevo" DROP NOT NULL,
      ALTER COLUMN "descripcion_nueva" DROP NOT NULL
    `);
    console.log('✅ Campos hechos opcionales');

    console.log('\n🎉 Migración del sistema de comparación mensual completada exitosamente');

    console.log('\n📋 Próximos pasos:');
    console.log('1. ✅ Base de datos configurada y migrada');
    console.log('2. 🚀 Iniciar API: cd apps/api && npm run dev');
    console.log('3. 🌐 Iniciar Web: cd apps/web && npm run dev');
    console.log('4. 🧪 Probar sistema: http://localhost:3000/comparacion-mensual');

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verificar que PostgreSQL esté corriendo');
      console.log('2. Ejecutar: node scripts/verificar-postgres.js');
      console.log('3. Verificar que la base de datos existe');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateDesdeRaiz();
}

module.exports = { migrateDesdeRaiz };



