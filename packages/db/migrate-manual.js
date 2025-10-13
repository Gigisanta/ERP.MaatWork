const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar si ya existen los campos
    const checkFields = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'auditoria_cargas' 
      AND column_name = 'ausentes_detectados'
    `);

    if (checkFields.rows.length === 0) {
      console.log('Agregando campo ausentes_detectados a auditoria_cargas...');
      await client.query(`
        ALTER TABLE "auditoria_cargas" 
        ADD COLUMN "ausentes_detectados" integer DEFAULT 0 NOT NULL
      `);
      console.log('✅ Campo ausentes_detectados agregado');
    } else {
      console.log('✅ Campo ausentes_detectados ya existe');
    }

    // Verificar si ya existe el campo requiere_confirmacion_asesor
    const checkConfirmacion = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'diff_detalle' 
      AND column_name = 'requiere_confirmacion_asesor'
    `);

    if (checkConfirmacion.rows.length === 0) {
      console.log('Agregando campo requiere_confirmacion_asesor a diff_detalle...');
      await client.query(`
        ALTER TABLE "diff_detalle" 
        ADD COLUMN "requiere_confirmacion_asesor" boolean DEFAULT false NOT NULL
      `);
      console.log('✅ Campo requiere_confirmacion_asesor agregado');
    } else {
      console.log('✅ Campo requiere_confirmacion_asesor ya existe');
    }

    // Verificar si ya existe el índice
    const checkIndex = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname = 'idx_diff_detalle_confirmacion'
    `);

    if (checkIndex.rows.length === 0) {
      console.log('Creando índice idx_diff_detalle_confirmacion...');
      await client.query(`
        CREATE INDEX "idx_diff_detalle_confirmacion" 
        ON "diff_detalle" ("requiere_confirmacion_asesor")
      `);
      console.log('✅ Índice creado');
    } else {
      console.log('✅ Índice ya existe');
    }

    // Hacer campos opcionales en diff_detalle para ausentes
    console.log('Haciendo campos opcionales en diff_detalle...');
    await client.query(`
      ALTER TABLE "diff_detalle" 
      ALTER COLUMN "comitente_nuevo" DROP NOT NULL,
      ALTER COLUMN "cuotapartista_nuevo" DROP NOT NULL,
      ALTER COLUMN "descripcion_nueva" DROP NOT NULL
    `);
    console.log('✅ Campos hechos opcionales');

    console.log('🎉 Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();


