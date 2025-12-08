#!/usr/bin/env node

/**
 * Script de verificación de prerequisitos para setup inicial
 * Verifica que todas las dependencias y servicios estén disponibles
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;

let hasErrors = false;
let hasWarnings = false;

/**
 * Ejecutar comando y capturar output
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      ...options 
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.message || String(err) };
  }
}

/**
 * Verificar Node.js
 */
function checkNodeVersion() {
  console.log(info('📦 Verificando Node.js...'));
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  if (majorVersion >= 22 && majorVersion < 25) {
    console.log(success(`  ✅ Node.js ${nodeVersion} (requerido: >=22.0.0 <25.0.0)`));
    return true;
  } else {
    console.log(error(`  ❌ Node.js ${nodeVersion} (requerido: >=22.0.0 <25.0.0)`));
    console.log(error('     Por favor actualiza Node.js a la versión 22 o 23'));
    hasErrors = true;
    return false;
  }
}

/**
 * Verificar pnpm
 */
function checkPnpm() {
  console.log(info('📦 Verificando pnpm...'));
  
  const result = execCommand('pnpm --version');
  
  if (result.success) {
    const version = result.output;
    const majorVersion = parseInt(version.split('.')[0], 10);
    
    if (majorVersion >= 9) {
      console.log(success(`  ✅ pnpm ${version} (requerido: >=9.0.0)`));
      return true;
    } else {
      console.log(error(`  ❌ pnpm ${version} (requerido: >=9.0.0)`));
      console.log(error('     Instala pnpm: npm install -g pnpm@latest'));
      hasErrors = true;
      return false;
    }
  } else {
    console.log(error('  ❌ pnpm no está instalado'));
    console.log(error('     Instala pnpm: npm install -g pnpm@latest'));
    hasErrors = true;
    return false;
  }
}

/**
 * Verificar Docker
 */
function checkDocker() {
  console.log(info('🐳 Verificando Docker...'));
  
  const result = execCommand('docker --version');
  
  if (result.success) {
    console.log(success(`  ✅ Docker instalado: ${result.output}`));
    
    // Verificar si Docker está corriendo
    const dockerPsResult = execCommand('docker ps');
    if (dockerPsResult.success) {
      console.log(success('  ✅ Docker está corriendo'));
      return true;
    } else {
      console.log(warning('  ⚠️  Docker está instalado pero no está corriendo'));
      console.log(warning('     Inicia Docker Desktop antes de continuar'));
      hasWarnings = true;
      return false;
    }
  } else {
    console.log(error('  ❌ Docker no está instalado'));
    console.log(error('     Docker es requerido para ejecutar PostgreSQL localmente'));
    console.log(error('     Instala Docker Desktop desde https://www.docker.com/products/docker-desktop'));
    hasErrors = true;
    return false;
  }
}

/**
 * Verificar PostgreSQL en Docker
 */
function checkPostgreSQL() {
  console.log(info('🗄️  Verificando PostgreSQL...'));
  
  // Verificar si hay un contenedor PostgreSQL corriendo
  const dockerResult = execCommand('docker ps --format "{{.Names}}" | grep -i postgres');
  
  if (dockerResult.success && dockerResult.output) {
    const containerName = dockerResult.output.split('\n')[0];
    console.log(success(`  ✅ PostgreSQL corriendo en Docker: ${containerName}`));
    return true;
  }
  
  // Verificar si docker-compose está disponible
  const dockerComposeResult = execCommand('docker compose version 2>/dev/null || docker-compose version 2>/dev/null');
  
  if (dockerComposeResult.success) {
    console.log(warning('  ⚠️  PostgreSQL no está corriendo'));
    console.log(warning('     El setup intentará iniciarlo automáticamente'));
    hasWarnings = true;
    return false;
  }
  
  console.log(error('  ❌ Docker Compose no está disponible'));
  console.log(error('     Necesitas Docker Compose para iniciar PostgreSQL'));
  hasErrors = true;
  return false;
}

/**
 * Verificar si .env existe
 */
function checkEnvFile() {
  console.log(info('🔧 Verificando configuración de entorno...'));
  
  const envPath = path.join(projectRoot, 'apps', 'api', '.env');
  const envExamplePath = path.join(projectRoot, 'apps', 'api', 'config-example.env');
  
  if (fs.existsSync(envPath)) {
    console.log(success('  ✅ Archivo apps/api/.env existe'));
    return { exists: true, needsSetup: false };
  } else {
    if (fs.existsSync(envExamplePath)) {
      console.log(warning('  ⚠️  Archivo apps/api/.env no existe'));
      console.log(warning('     El setup lo creará desde config-example.env'));
      return { exists: false, needsSetup: true };
    } else {
      console.log(error('  ❌ Archivo config-example.env no encontrado'));
      hasErrors = true;
      return { exists: false, needsSetup: false };
    }
  }
}

/**
 * Función principal
 */
function main() {
  console.log(bold.cyan('\n🔍 Verificando prerequisitos para setup inicial...\n'));
  
  const checks = [
    { name: 'Node.js', fn: checkNodeVersion },
    { name: 'pnpm', fn: checkPnpm },
    { name: 'Docker', fn: checkDocker },
    { name: 'PostgreSQL', fn: checkPostgreSQL },
    { name: 'Configuración', fn: checkEnvFile },
  ];
  
  const results = checks.map(check => ({
    name: check.name,
    result: check.fn()
  }));
  
  console.log('');
  
  if (hasErrors) {
    console.log(error('❌ Hay errores críticos que deben resolverse antes de continuar'));
    console.log(error('   Por favor corrige los errores arriba y ejecuta el setup nuevamente\n'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(warning('⚠️  Hay advertencias pero puedes continuar'));
    console.log(warning('   El setup intentará resolverlas automáticamente\n'));
    process.exit(0);
  } else {
    console.log(success('✅ Todos los prerequisitos están disponibles\n'));
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { 
  main, 
  checkNodeVersion, 
  checkPnpm, 
  checkDocker, 
  checkPostgreSQL, 
  checkEnvFile 
};
