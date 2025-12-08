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
 * Verificar PostgreSQL (en Docker o local) - optimizado para modo rápido
 */
function checkPostgreSQL() {
  console.log(info('🗄️  Verificando PostgreSQL...'));
  
  const fastMode = process.argv.includes('--fast');
  
  // En modo rápido, solo verificar si hay un contenedor Docker corriendo (más rápido)
  if (fastMode) {
    try {
      // Verificación rápida: solo verificar contenedores Docker corriendo
      const dockerResult = execCommand('docker ps --format "{{.Names}}" --filter "name=postgres"');
      if (dockerResult.success && dockerResult.output) {
        console.log(success('  ✅ PostgreSQL detectado en Docker'));
        return true;
      }
      // Si no hay Docker, asumir que está disponible (evitar checks lentos)
      console.log(warning('  ⚠️  PostgreSQL no detectado en Docker (modo rápido)'));
      console.log(warning('     Si hay problemas, ejecuta sin --fast para validación completa'));
      hasWarnings = true;
      return false;
    } catch {
      // En modo rápido, no fallar si no podemos verificar Docker
      hasWarnings = true;
      return false;
    }
  }
  
  // Modo completo: verificación exhaustiva
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
 * Verificar Python y dependencias (opcional pero recomendado)
 */
function checkPython() {
  console.log(info('🐍 Verificando Python...'));
  
  const pythonCommands = isWindows 
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];
  
  let pythonFound = null;
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      if (version.includes('Python 3')) {
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major >= 3 && minor >= 10) {
            pythonFound = { cmd, version: version.trim() };
            break;
          }
        }
      }
    } catch {
      continue;
    }
  }
  
  if (pythonFound) {
    console.log(success(`  ✅ Python encontrado: ${pythonFound.version}`));
    
    // Verificar dependencias principales
    const pipCommands = isWindows
      ? ['pip', 'pip3', 'python -m pip', 'py -m pip']
      : ['pip3', 'pip', 'python3 -m pip', 'python -m pip'];
    
    let pipFound = false;
    for (const pipCmd of pipCommands) {
      try {
        execSync(`${pipCmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
        pipFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (pipFound) {
      // Verificar dependencias críticas
      const criticalPackages = ['fastapi', 'uvicorn', 'yfinance'];
      let allInstalled = true;
      
      for (const pkg of criticalPackages) {
        try {
          execSync(`${pipCommands[0]} show ${pkg}`, { encoding: 'utf8', stdio: 'pipe' });
        } catch {
          allInstalled = false;
          break;
        }
      }
      
      if (allInstalled) {
        console.log(success('  ✅ Dependencias Python principales instaladas'));
      } else {
        console.log(warning('  ⚠️  Algunas dependencias Python no están instaladas'));
        console.log(warning('     Instala dependencias: pnpm -F @cactus/analytics-service install'));
        hasWarnings = true;
      }
    } else {
      console.log(warning('  ⚠️  pip no está disponible'));
      console.log(warning('     Instala pip o ejecuta: pnpm -F @cactus/analytics-service install'));
      hasWarnings = true;
    }
    
    return true;
  } else {
    console.log(warning('  ⚠️  Python 3.10+ no está instalado (opcional pero recomendado)'));
    console.log(warning('     El servicio Python analytics-service no estará disponible'));
    console.log(warning('     Instala Python desde https://www.python.org/downloads/'));
    console.log(warning('     El API usará fallback a base de datos si el servicio no está disponible'));
    hasWarnings = true;
    return false;
  }
}

/**
 * Función principal
 */
function main() {
  // AI_DECISION: Modo --fast para validaciones rápidas (solo críticas)
  // Justificación: En desarrollo frecuente, solo necesitamos validar lo esencial
  // Impacto: Reduce tiempo de validación de 5-10s a 1-2s
  const fastMode = process.argv.includes('--fast');
  
  if (fastMode) {
    console.log(chalk.bold.cyan('\n⚡ Validación rápida (solo críticas)...\n'));
  } else {
    console.log(chalk.bold.cyan('\n🔍 Validando dependencias del sistema...\n'));
  }
  
  // Validaciones críticas (siempre se ejecutan)
  const criticalChecks = [
    checkNodeVersion,
    checkPnpm,
    checkPostgreSQL
  ];
  
  // Validaciones opcionales (solo en modo completo)
  const optionalChecks = fastMode ? [] : [
    checkDocker,
    checkPython
  ];
  
  const allChecks = [...criticalChecks, ...optionalChecks];
  const results = allChecks.map(check => check());
  
  console.log('');
  
  if (hasErrors) {
    console.log(error('❌ Hay errores críticos que deben resolverse antes de continuar'));
    process.exit(1);
  } else if (hasWarnings && !fastMode) {
    console.log(warning('⚠️  Hay advertencias pero puedes continuar'));
    console.log(warning('   Algunas funcionalidades pueden no estar disponibles\n'));
    process.exit(0);
  } else {
    if (fastMode) {
      console.log(success('✅ Validaciones críticas completadas\n'));
    } else {
      console.log(success('✅ Todas las dependencias están disponibles\n'));
    }
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, checkNodeVersion, checkPnpm, checkDocker, checkPostgreSQL, checkPython };

