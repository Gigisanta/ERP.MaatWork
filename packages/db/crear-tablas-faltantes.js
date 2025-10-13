const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function crearTablasFaltantes() {
  console.log('🔧 Creando tablas faltantes del sistema...\n');

  let databaseUrl = null;
  
  try {
    const envPath = path.join(__dirname, '../../.env');
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

    // Verificar tablas existentes
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Tablas existentes: ${existingTables.rows.length}`);
    existingTables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Tablas que necesitamos crear
    const tablasNecesarias = [
      {
        nombre: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS "users" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "email" varchar(255) NOT NULL UNIQUE,
            "fullName" varchar(255) NOT NULL,
            "role" varchar(50) NOT NULL DEFAULT 'advisor',
            "passwordHash" varchar(255),
            "isActive" boolean NOT NULL DEFAULT true,
            "lastLogin" timestamp,
            "createdAt" timestamp DEFAULT now(),
            "updatedAt" timestamp DEFAULT now()
          )
        `
      },
      {
        nombre: 'contacts',
        sql: `
          CREATE TABLE IF NOT EXISTS "contacts" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "firstName" varchar(255) NOT NULL,
            "lastName" varchar(255) NOT NULL,
            "email" varchar(255),
            "phone" varchar(50),
            "phoneSecondary" varchar(50),
            "company" varchar(255),
            "position" varchar(255),
            "notes" text,
            "assignedTo" uuid REFERENCES "users"("id"),
            "status" varchar(50) NOT NULL DEFAULT 'active',
            "createdAt" timestamp DEFAULT now(),
            "updatedAt" timestamp DEFAULT now()
          )
        `
      },
      {
        nombre: 'pipeline',
        sql: `
          CREATE TABLE IF NOT EXISTS "pipeline" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "contactId" uuid REFERENCES "contacts"("id") ON DELETE CASCADE,
            "stage" varchar(100) NOT NULL,
            "value" decimal(15,2),
            "probability" integer DEFAULT 0,
            "expectedCloseDate" date,
            "notes" text,
            "assignedTo" uuid REFERENCES "users"("id"),
            "status" varchar(50) NOT NULL DEFAULT 'active',
            "createdAt" timestamp DEFAULT now(),
            "updatedAt" timestamp DEFAULT now()
          )
        `
      },
      {
        nombre: 'notes',
        sql: `
          CREATE TABLE IF NOT EXISTS "notes" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "contactId" uuid REFERENCES "contacts"("id") ON DELETE CASCADE,
            "pipelineId" uuid REFERENCES "pipeline"("id") ON DELETE CASCADE,
            "content" text NOT NULL,
            "type" varchar(50) NOT NULL DEFAULT 'general',
            "createdBy" uuid REFERENCES "users"("id"),
            "createdAt" timestamp DEFAULT now(),
            "updatedAt" timestamp DEFAULT now()
          )
        `
      },
      {
        nombre: 'tags',
        sql: `
          CREATE TABLE IF NOT EXISTS "tags" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" varchar(100) NOT NULL UNIQUE,
            "color" varchar(7) DEFAULT '#3b82f6',
            "description" text,
            "createdAt" timestamp DEFAULT now()
          )
        `
      },
      {
        nombre: 'contact_tags',
        sql: `
          CREATE TABLE IF NOT EXISTS "contact_tags" (
            "contactId" uuid REFERENCES "contacts"("id") ON DELETE CASCADE,
            "tagId" uuid REFERENCES "tags"("id") ON DELETE CASCADE,
            "assignedBy" uuid REFERENCES "users"("id"),
            "assignedAt" timestamp DEFAULT now(),
            PRIMARY KEY ("contactId", "tagId")
          )
        `
      }
    ];

    console.log('\n🏗️ Creando tablas faltantes...');

    for (const tabla of tablasNecesarias) {
      const exists = existingTables.rows.some(row => row.table_name === tabla.nombre);
      
      if (exists) {
        console.log(`✅ Tabla ${tabla.nombre} ya existe`);
      } else {
        console.log(`➕ Creando tabla ${tabla.nombre}...`);
        await client.query(tabla.sql);
        console.log(`✅ Tabla ${tabla.nombre} creada`);
      }
    }

    // Crear índices
    console.log('\n📊 Creando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")',
      'CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role")',
      'CREATE INDEX IF NOT EXISTS "idx_contacts_assigned_to" ON "contacts" ("assignedTo")',
      'CREATE INDEX IF NOT EXISTS "idx_contacts_status" ON "contacts" ("status")',
      'CREATE INDEX IF NOT EXISTS "idx_pipeline_contact_id" ON "pipeline" ("contactId")',
      'CREATE INDEX IF NOT EXISTS "idx_pipeline_stage" ON "pipeline" ("stage")',
      'CREATE INDEX IF NOT EXISTS "idx_notes_contact_id" ON "notes" ("contactId")',
      'CREATE INDEX IF NOT EXISTS "idx_notes_created_by" ON "notes" ("createdBy")'
    ];

    for (const indice of indices) {
      await client.query(indice);
    }
    console.log('✅ Índices creados');

    // Crear usuario admin por defecto
    console.log('\n👤 Verificando usuario admin...');
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', ['admin@cactus.com']);
    
    if (adminExists.rows.length === 0) {
      await client.query(`
        INSERT INTO users (email, "fullName", role, "passwordHash", "isActive") 
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@cactus.com', 'Administrador', 'admin', 'hashed_password_here', true]);
      console.log('✅ Usuario admin creado');
    } else {
      console.log('✅ Usuario admin ya existe');
    }

    // Verificar tablas finales
    const finalCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n🎯 Tablas finales en la base de datos:');
    finalCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    await client.end();

    console.log('\n🎉 Tablas del sistema creadas exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. ✅ Base de datos completa');
    console.log('2. 🔐 Usuario admin: admin@cactus.com');
    console.log('3. 🌐 Acceder a: http://localhost:3005');
    console.log('4. 📊 Sistema de comparación: http://localhost:3005/comparacion-mensual');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearTablasFaltantes();



