const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function crearBaseLimpia() {
  console.log('🧹 Creando base de datos limpia para el sistema...\n');

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

  // Conectar a la base de datos 'postgres' para crear nuestra base
  const adminUrl = databaseUrl.replace('/postgres', '/postgres');
  const adminClient = new Client({
    connectionString: adminUrl
  });

  try {
    await adminClient.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear base de datos cactus_db si no existe
    try {
      await adminClient.query('CREATE DATABASE cactus_db');
      console.log('✅ Base de datos cactus_db creada');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('✅ Base de datos cactus_db ya existe');
      } else {
        throw error;
      }
    }

    await adminClient.end();

    // Ahora conectar a la nueva base de datos
    const newDatabaseUrl = databaseUrl.replace('/postgres', '/cactus_db');
    const client = new Client({
      connectionString: newDatabaseUrl
    });

    await client.connect();
    console.log('✅ Conectado a cactus_db');

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

    await client.end();

    // Actualizar el archivo .env con la nueva URL
    const envContent = fs.readFileSync(path.join(__dirname, '../../apps/api/.env'), 'utf8');
    const updatedEnv = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL=${newDatabaseUrl}`
    );
    fs.writeFileSync(path.join(__dirname, '../../apps/api/.env'), updatedEnv, 'utf8');

    console.log('\n🎉 Base de datos limpia creada exitosamente!');
    console.log(`📊 URL actualizada: ${newDatabaseUrl}`);
    
    console.log('\n📋 Próximos pasos:');
    console.log('1. ✅ Base de datos configurada y creada');
    console.log('2. 🚀 Iniciar API: cd apps/api && npm run dev');
    console.log('3. 🌐 Iniciar Web: cd apps/web && npm run dev');
    console.log('4. 🧪 Probar sistema: http://localhost:3000/comparacion-mensual');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearBaseLimpia();



