#!/usr/bin/env node

/**
 * Script de validación de dependencias del sistema
 * Verifica Node.js, pnpm, Docker, y PostgreSQL antes de iniciar desarrollo
 */

const { execSync } = require('child_process');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

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
 * Verificar versión de Node.js
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
 * Verificar Docker (opcional pero recomendado)
 */
function checkDocker() {
  console.log(info('🐳 Verificando Docker...'));
  
  const result = execCommand('docker --version');
  
  if (result.success) {
    console.log(success(`  ✅ Docker instalado: ${result.output}`));
    return true;
  } else {
    console.log(warning('  ⚠️  Docker no está instalado (opcional)'));
    console.log(warning('     Docker es recomendado para ejecutar PostgreSQL localmente'));
    hasWarnings = true;
    return false;
  }
}

/**
 * Verificar PostgreSQL (en Docker o local)
 */
function checkPostgreSQL() {
  console.log(info('🗄️  Verificando PostgreSQL...'));
  
  // Primero verificar si hay un contenedor Docker corriendo
  const dockerResult = execCommand('docker ps --format "{{.Names}}" | grep -i postgres');
  
  if (dockerResult.success && dockerResult.output) {
    console.log(success(`  ✅ PostgreSQL corriendo en Docker: ${dockerResult.output.split('\n')[0]}`));
    return true;
  }
  
  // Verificar si PostgreSQL está corriendo localmente
  let pgCheckCommand;
  if (isWindows) {
    // Windows: verificar servicio
    pgCheckCommand = 'sc query postgresql* 2>nul | findstr "RUNNING"';
  } else {
    // Unix/Linux/macOS: usar pg_isready
    pgCheckCommand = 'pg_isready -h localhost -U postgres 2>/dev/null || pg_isready -h localhost 2>/dev/null';
  }
  
  const pgResult = execCommand(pgCheckCommand);
  
  if (pgResult.success) {
    console.log(success('  ✅ PostgreSQL está corriendo localmente'));
    return true;
  }
  
  // Verificar si docker-compose está disponible para iniciar PostgreSQL
  const dockerComposeResult = execCommand('docker compose version 2>/dev/null || docker-compose version 2>/dev/null');
  
  if (dockerComposeResult.success) {
    console.log(warning('  ⚠️  PostgreSQL no está corriendo'));
    console.log(warning('     Puedes iniciarlo con: docker compose up -d'));
    console.log(warning('     El script intentará iniciarlo automáticamente si Docker está disponible'));
    hasWarnings = true;
    return false;
  }
  
  console.log(error('  ❌ PostgreSQL no está disponible'));
  console.log(error('     Opciones:'));
  console.log(error('     1. Instala Docker y ejecuta: docker compose up -d'));
  console.log(error('     2. Instala PostgreSQL localmente'));
  hasErrors = true;
  return false;
}

/**
 * Verificar tmux (solo en Unix)
 */
function checkTmux() {
  if (isWindows) {
    // Windows no usa tmux
    return true;
  }
  
  console.log(info('🖥️  Verificando tmux...'));
  
  const result = execCommand('tmux -V');
  
  if (result.success) {
    console.log(success(`  ✅ tmux instalado: ${result.output}`));
    return true;
  } else {
    console.log(warning('  ⚠️  tmux no está instalado (opcional pero recomendado)'));
    console.log(warning('     Instala tmux para mejor experiencia de desarrollo:'));
    console.log(warning('       macOS:   brew install tmux'));
    console.log(warning('       Ubuntu:  sudo apt-get install tmux'));
    console.log(warning('       Arch:    sudo pacman -S tmux'));
    hasWarnings = true;
    return false;
  }
}

/**
 * Función principal
 */
function main() {
  console.log(chalk.bold.cyan('\n🔍 Validando dependencias del sistema...\n'));
  
  const checks = [
    checkNodeVersion,
    checkPnpm,
    checkDocker,
    checkPostgreSQL,
    checkTmux
  ];
  
  const results = checks.map(check => check());
  
  console.log('');
  
  if (hasErrors) {
    console.log(error('❌ Hay errores críticos que deben resolverse antes de continuar'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(warning('⚠️  Hay advertencias pero puedes continuar'));
    console.log(warning('   Algunas funcionalidades pueden no estar disponibles\n'));
    process.exit(0);
  } else {
    console.log(success('✅ Todas las dependencias están disponibles\n'));
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, checkNodeVersion, checkPnpm, checkDocker, checkPostgreSQL, checkTmux };

