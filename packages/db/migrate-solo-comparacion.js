const { Client } = require('pg');
const fs = require('fs');

async function migrateSoloComparacion() {
  // Leer DATABASE_URL desde el archivo .env
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // Intentar leer desde archivo .env
    try {
      const envPath = path.join(__dirname, '../../apps/api/.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) {
          databaseUrl = match[1];
        }
      }
    } catch (error) {
      console.log('No se pudo leer DATABASE_URL del archivo .env');
    }
  }

  if (!databaseUrl) {
    console.log('❌ DATABASE_URL no configurada');
    console.log('Por favor configura DATABASE_URL en apps/api/.env');
    console.log('Ejemplo: DATABASE_URL=postgresql://usuario:password@localhost:5432/cactus_db');
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

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verificar que PostgreSQL esté corriendo');
      console.log('2. Verificar la URL de conexión en apps/api/.env');
      console.log('3. Verificar que la base de datos existe');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateSoloComparacion();
}

module.exports = { migrateSoloComparacion };


