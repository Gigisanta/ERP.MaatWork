#!/usr/bin/env node

/**
 * Script para configurar la conexión a la base de datos
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Configuración de Base de Datos para Sistema de Comparación Mensual\n');

// Función para leer archivo .env
function readEnvFile() {
  const envPath = path.join(__dirname, '../apps/api/.env');
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('❌ No se pudo leer el archivo .env');
    return null;
  }
}

// Función para escribir archivo .env
function writeEnvFile(content) {
  const envPath = path.join(__dirname, '../apps/api/.env');
  try {
    fs.writeFileSync(envPath, content, 'utf8');
    return true;
  } catch (error) {
    console.log('❌ No se pudo escribir el archivo .env');
    return false;
  }
}

// Función para actualizar DATABASE_URL
function updateDatabaseUrl(envContent, newUrl) {
  return envContent.replace(
    /DATABASE_URL=.*/,
    `DATABASE_URL=${newUrl}`
  );
}

console.log('📋 Opciones de configuración de base de datos:\n');

console.log('1️⃣ PostgreSQL Local (Docker):');
console.log('   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cactus_db\n');

console.log('2️⃣ PostgreSQL Local (Instalación directa):');
console.log('   DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/cactus_db\n');

console.log('3️⃣ PostgreSQL con usuario específico:');
console.log('   DATABASE_URL=postgresql://cactus_user:cactus_pass@localhost:5432/cactus_db\n');

console.log('4️⃣ PostgreSQL remoto:');
console.log('   DATABASE_URL=postgresql://usuario:password@servidor.com:5432/cactus_db\n');

console.log('💡 Para configurar automáticamente, ejecuta:');
console.log('   node scripts/configurar-database.js --url="tu_database_url_aqui"');

// Verificar si se pasó una URL como parámetro
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));

if (urlArg) {
  const newUrl = urlArg.split('=')[1].replace(/"/g, '');
  
  console.log(`\n🔧 Configurando DATABASE_URL: ${newUrl}`);
  
  const envContent = readEnvFile();
  if (envContent) {
    const updatedContent = updateDatabaseUrl(envContent, newUrl);
    
    if (writeEnvFile(updatedContent)) {
      console.log('✅ DATABASE_URL configurada exitosamente');
      console.log('\n📋 Próximos pasos:');
      console.log('1. Verificar que PostgreSQL esté corriendo');
      console.log('2. Ejecutar: cd packages/db && node migrate-solo-comparacion.js');
      console.log('3. Iniciar servicios: cd apps/api && npm run dev');
    } else {
      console.log('❌ Error configurando DATABASE_URL');
    }
  }
} else {
  console.log('\n⚠️ Para usar el sistema, necesitas configurar DATABASE_URL');
  console.log('\nEjemplo de configuración automática:');
  console.log('node scripts/configurar-database.js --url="postgresql://postgres:postgres@localhost:5432/cactus_db"');
  
  console.log('\nO edita manualmente apps/api/.env y cambia la línea:');
  console.log('DATABASE_URL=postgresql://usuario:password@localhost:5432/cactus_db');
}

console.log('\n🔍 Verificando configuración actual...');
const envContent = readEnvFile();
if (envContent) {
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    const currentUrl = match[1];
    console.log(`📊 DATABASE_URL actual: ${currentUrl}`);
    
    if (currentUrl.includes('usuario:password')) {
      console.log('⚠️ DATABASE_URL tiene valores de ejemplo - necesita configuración real');
    } else {
      console.log('✅ DATABASE_URL parece estar configurada');
    }
  }
}


