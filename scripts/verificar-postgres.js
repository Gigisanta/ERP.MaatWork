#!/usr/bin/env node

/**
 * Script para verificar y configurar PostgreSQL
 */

const { Client } = require('pg');

console.log('🔍 Verificando conexión a PostgreSQL...\n');

// URLs comunes para probar
const urlsToTest = [
  'postgresql://postgres:postgres@localhost:5432/cactus_db',
  'postgresql://postgres:password@localhost:5432/cactus_db',
  'postgresql://postgres:@localhost:5432/cactus_db',
  'postgresql://postgres:postgres@localhost:5432/postgres',
  'postgresql://postgres:password@localhost:5432/postgres'
];

async function testConnection(url, description) {
  const client = new Client({
    connectionString: url
  });

  try {
    await client.connect();
    console.log(`✅ ${description}`);
    console.log(`   URL: ${url}`);
    
    // Verificar que podemos crear la base de datos si no existe
    try {
      await client.query('SELECT 1');
      console.log(`   ✅ Conexión exitosa`);
      await client.end();
      return url;
    } catch (error) {
      console.log(`   ❌ Error en consulta: ${error.message}`);
      await client.end();
      return null;
    }
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   URL: ${url}`);
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Probando conexiones comunes...\n');

  let workingUrl = null;

  for (const url of urlsToTest) {
    const description = `Probando: ${url.split('@')[0]}@${url.split('@')[1].split('/')[0]}`;
    const result = await testConnection(url, description);
    if (result) {
      workingUrl = result;
      break;
    }
  }

  if (workingUrl) {
    console.log(`\n🎉 ¡Conexión exitosa encontrada!`);
    console.log(`📊 URL funcionando: ${workingUrl}`);
    
    console.log(`\n🔧 Configurando automáticamente...`);
    
    // Configurar automáticamente el .env
    const fs = require('fs');
    const path = require('path');
    
    try {
      const envPath = path.join(__dirname, '../apps/api/.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${workingUrl}`
      );
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`✅ Archivo .env actualizado`);
      
      console.log(`\n📋 Próximos pasos:`);
      console.log(`1. ✅ Base de datos configurada`);
      console.log(`2. 🔄 Ejecutar migración: cd packages/db && node migrate-solo-comparacion.js`);
      console.log(`3. 🚀 Iniciar API: cd apps/api && npm run dev`);
      console.log(`4. 🌐 Iniciar Web: cd apps/web && npm run dev`);
      
    } catch (error) {
      console.log(`❌ Error configurando .env: ${error.message}`);
    }
    
  } else {
    console.log(`\n❌ No se pudo conectar a PostgreSQL`);
    console.log(`\n💡 Posibles soluciones:`);
    console.log(`1. Verificar que PostgreSQL esté instalado y corriendo`);
    console.log(`2. Verificar que el puerto 5432 esté disponible`);
    console.log(`3. Configurar manualmente la URL en apps/api/.env`);
    console.log(`4. Usar Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`);
    
    console.log(`\n🐳 Para usar Docker (recomendado):`);
    console.log(`docker run -d --name cactus-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`);
  }
}

main().catch(console.error);



