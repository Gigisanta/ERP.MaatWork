const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function crearTablasEnPostgres() {
  console.log('🏗️ Creando tablas del sistema en base postgres...\n');

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

    // Verificar si las tablas ya existen
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('maestro_cuentas', 'staging_mensual', 'auditoria_cargas', 'diff_detalle', 'snapshots_maestro', 'asignaciones_asesor')
    `);

    if (checkTables.rows.length > 0) {
      console.log('⚠️ Algunas tablas ya existen:');
      checkTables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      console.log('\n¿Deseas continuar? Las tablas existentes no se modificarán.');
    }

    // Crear las tablas del sistema de comparación mensual
    console.log('\n🏗️ Creando tablas del sistema...');

    // Tabla maestro_cuentas
    await client.query(`
      CREATE TABLE IF NOT EXISTS "maestro_cuentas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idcuenta" varchar(255) NOT NULL UNIQUE,
        "comitente" integer NOT NULL,
        "cuotapartista" integer NOT NULL,
        "descripcion" text NOT NULL,
        "asesor" varchar(255),
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_alta" timestamp DEFAULT now(),
        "fecha_ultima_actualizacion" timestamp DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1
      )
    `);
    console.log('✅ Tabla maestro_cuentas creada');

    // Tabla staging_mensual
    await client.query(`
      CREATE TABLE IF NOT EXISTS "staging_mensual" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "carga_id" uuid NOT NULL,
        "idcuenta" varchar(255) NOT NULL,
        "comitente" integer NOT NULL,
        "cuotapartista" integer NOT NULL,
        "descripcion" text NOT NULL,
        "asesor" varchar(255),
        "procesado" boolean NOT NULL DEFAULT false,
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabla staging_mensual creada');

    // Tabla auditoria_cargas
    await client.query(`
      CREATE TABLE IF NOT EXISTS "auditoria_cargas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "mes" varchar(7) NOT NULL,
        "nombre_archivo" varchar(255) NOT NULL,
        "hash_archivo" varchar(255) NOT NULL,
        "estado" varchar(20) NOT NULL DEFAULT 'cargado',
        "total_registros" integer NOT NULL DEFAULT 0,
        "nuevos_detectados" integer NOT NULL DEFAULT 0,
        "modificados_detectados" integer NOT NULL DEFAULT 0,
        "ausentes_detectados" integer NOT NULL DEFAULT 0,
        "sin_asesor" integer NOT NULL DEFAULT 0,
        "aplicado_en" timestamp,
        "aplicado_por_user_id" uuid,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabla auditoria_cargas creada');

    // Tabla diff_detalle
    await client.query(`
      CREATE TABLE IF NOT EXISTS "diff_detalle" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "carga_id" uuid NOT NULL,
        "tipo" varchar(20) NOT NULL,
        "idcuenta" varchar(255) NOT NULL,
        "comitente_anterior" integer,
        "comitente_nuevo" integer,
        "cuotapartista_anterior" integer,
        "cuotapartista_nuevo" integer,
        "descripcion_anterior" text,
        "descripcion_nueva" text,
        "asesor_anterior" varchar(255),
        "asesor_nuevo" varchar(255),
        "campos_cambiados" text[],
        "requiere_confirmacion_asesor" boolean NOT NULL DEFAULT false,
        "aplicado" boolean NOT NULL DEFAULT false,
        "aplicado_en" timestamp,
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabla diff_detalle creada');

    // Tabla snapshots_maestro
    await client.query(`
      CREATE TABLE IF NOT EXISTS "snapshots_maestro" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "carga_id" uuid NOT NULL,
        "tipo" varchar(10) NOT NULL,
        "hash_contenido" varchar(255) NOT NULL,
        "contenido" jsonb NOT NULL,
        "total_registros" integer NOT NULL,
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabla snapshots_maestro creada');

    // Tabla asignaciones_asesor
    await client.query(`
      CREATE TABLE IF NOT EXISTS "asignaciones_asesor" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "carga_id" uuid NOT NULL,
        "idcuenta" varchar(255) NOT NULL,
        "asesor_anterior" varchar(255),
        "asesor_nuevo" varchar(255) NOT NULL,
        "motivo" text,
        "aplicado" boolean NOT NULL DEFAULT false,
        "asignado_por_user_id" uuid,
        "fecha_asignacion" timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabla asignaciones_asesor creada');

    // Crear índices
    console.log('\n📊 Creando índices...');
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_maestro_cuentas_idcuenta" ON "maestro_cuentas" ("idcuenta")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_staging_carga_id" ON "staging_mensual" ("carga_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_auditoria_mes_hash" ON "auditoria_cargas" ("mes", "hash_archivo")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diff_carga_tipo" ON "diff_detalle" ("carga_id", "tipo")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_diff_confirmacion" ON "diff_detalle" ("requiere_confirmacion_asesor")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_snapshots_carga" ON "snapshots_maestro" ("carga_id")`);
    console.log('✅ Índices creados');

    // Verificar tablas creadas
    const finalCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('maestro_cuentas', 'staging_mensual', 'auditoria_cargas', 'diff_detalle', 'snapshots_maestro', 'asignaciones_asesor')
      ORDER BY table_name
    `);

    console.log('\n🎯 Tablas del sistema creadas:');
    finalCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    await client.end();

    console.log('\n🎉 Sistema de comparación mensual configurado exitosamente!');
    
    console.log('\n📋 Próximos pasos:');
    console.log('1. ✅ Base de datos configurada y tablas creadas');
    console.log('2. 🚀 Iniciar API: cd apps/api && npm run dev');
    console.log('3. 🌐 Iniciar Web: cd apps/web && npm run dev');
    console.log('4. 🧪 Probar sistema: http://localhost:3000/comparacion-mensual');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearTablasEnPostgres();


