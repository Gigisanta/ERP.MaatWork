#!/usr/bin/env node

/**
 * Script wrapper para desarrollo cross-platform
 * Detecta el OS y ejecuta el comando apropiado
 * Incluye validaciones pre-inicio y health checks
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const {
  resolveAnalyticsPort,
  buildAnalyticsServiceUrl,
  DEFAULT_ANALYTICS_PORT
} = require('./utils/analytics-port');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const validationCacheFile = path.join(projectRoot, '.dev-validation-cache.json');
const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;

const analyticsPort = resolveAnalyticsPort();
const analyticsUrl = buildAnalyticsServiceUrl(analyticsPort);

process.env.ANALYTICS_PORT = String(analyticsPort);
process.env.ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || analyticsUrl;
process.env.PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || analyticsUrl;

/**
 * Limpiar archivos PID stale de Turbo
 * Elimina archivos PID huérfanos que pueden causar warnings al iniciar Turbo
 * @returns {boolean} true si se encontraron y limpiaron PID stale, false en caso contrario
 */
function cleanTurboStalePids() {
  try {
    const os = require('os');
    const tmpDir = os.tmpdir();
    const turbodDir = path.join(tmpDir, 'turbod');
    
    if (!fs.existsSync(turbodDir)) {
      return false; // No hay directorio turbod, nada que limpiar
    }
    
    // Buscar archivos PID stale en subdirectorios de turbod
    const entries = fs.readdirSync(turbodDir, { withFileTypes: true });
    let cleanedCount = 0;
    let foundStalePids = false;
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pidFile = path.join(turbodDir, entry.name, 'turbod.pid');
        const sockFile = path.join(turbodDir, entry.name, 'turbod.sock');
        const dirPath = path.join(turbodDir, entry.name);
        
        if (fs.existsSync(pidFile)) {
          try {
            // Verificar si el proceso aún existe
            const pidContent = fs.readFileSync(pidFile, 'utf8').trim();
            const pid = parseInt(pidContent, 10);
            
            if (pid && !isProcessRunning(pid)) {
              foundStalePids = true;
              // Proceso no existe, eliminar archivos y directorio
              try {
                if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
                if (fs.existsSync(sockFile)) fs.unlinkSync(sockFile);
                // Eliminar directorio completo si está vacío o solo contiene archivos stale
                try {
                  const dirContents = fs.readdirSync(dirPath);
                  // Si solo quedan archivos de log, eliminar todo
                  if (dirContents.length === 0 || dirContents.every(f => f.endsWith('.log'))) {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                  }
                } catch {
                  // Ignorar si no se puede eliminar
                }
              } catch {
                // Ignorar errores de eliminación
              }
              cleanedCount++;
            }
          } catch {
            // Si no podemos leer el PID o verificar, eliminar de todas formas si el archivo es muy antiguo
            try {
              const stats = fs.statSync(pidFile);
              const age = Date.now() - stats.mtimeMs;
              // Si el archivo tiene más de 1 hora, considerarlo stale
              if (age > 60 * 60 * 1000) {
                foundStalePids = true;
                if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
                if (fs.existsSync(sockFile)) fs.unlinkSync(sockFile);
                cleanedCount++;
              }
            } catch {
              // Ignorar errores
            }
          }
        }
      }
    }
    
    if (cleanedCount > 0) {
      // Solo mostrar si realmente limpiamos algo (modo silencioso)
      // El mensaje será manejado por Turbo si hay warnings
    }
    
    return foundStalePids;
  } catch {
    // Ignorar errores silenciosamente - no es crítico
    return false;
  }
}

/**
 * Limpiar cache local de Turbo cuando está corrupto
 * Solo se ejecuta si se solicita explícitamente o se detectan problemas
 */
function cleanTurboCache() {
  try {
    const turboCacheDir = path.join(projectRoot, '.turbo');
    if (fs.existsSync(turboCacheDir)) {
      // Solo limpiar cache si hay problemas detectados
      // Por ahora, solo limpiar si se solicita explícitamente
      // Se puede mejorar para detectar corrupción automáticamente
    }
  } catch {
    // Ignorar errores
  }
}

/**
 * Reiniciar daemon de Turbo cuando está bloqueado
 * Detiene el daemon, limpia PID stale, y lo reinicia
 */
function restartTurboDaemon() {
  try {
    // Detener daemon si está corriendo
    try {
      execSync('pnpm turbo daemon stop', { stdio: 'ignore', cwd: projectRoot });
    } catch {
      // Ignorar si no está corriendo
    }
    // Limpiar PID stale después de detener
    cleanTurboStalePids();
    // Iniciar daemon nuevamente
    execSync('pnpm turbo daemon start', { stdio: 'ignore', cwd: projectRoot });
  } catch {
    // Ignorar errores - Turbo iniciará el daemon automáticamente si es necesario
  }
}

/**
 * Verificar si un proceso está corriendo (cross-platform)
 */
function isProcessRunning(pid) {
  try {
    if (isWindows) {
      // Windows: usar tasklist y verificar que el PID esté en la salida
      const output = execSync(`tasklist /FI "PID eq ${pid}"`, { 
        encoding: 'utf8',
        stdio: 'pipe' 
      });
      // tasklist retorna el PID en la salida si el proceso existe
      return output.includes(String(pid));
    } else {
      // Unix/Linux/macOS: usar kill -0
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Verificar e iniciar servicios Docker (PostgreSQL y N8N)
 */
function ensureDockerServices() {
  try {
    console.log(info('🗄️  Verificando servicios Docker (PostgreSQL y N8N)...'));
    
    // Verificar si Docker está disponible
    try {
      execSync('docker --version', { stdio: 'ignore', cwd: projectRoot });
    } catch {
      console.log(warning('⚠️  Docker no está disponible, saltando verificación de servicios Docker\n'));
      return;
    }
    
    // Verificar si docker-compose.yml existe
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    if (!fs.existsSync(dockerComposePath)) {
      console.log(warning('⚠️  docker-compose.yml no encontrado\n'));
      return;
    }
    
    // Verificar qué servicios están corriendo usando docker compose ps
    let postgresRunning = false;
    let n8nRunning = false;
    
    try {
      // Usar docker compose ps para verificar solo los servicios de este proyecto
      const dockerComposePsOutput = execSync('docker compose ps --format json', { 
        encoding: 'utf8',
        cwd: projectRoot 
      });
      
      // Parsear JSON si hay salida
      if (dockerComposePsOutput.trim()) {
        const containers = dockerComposePsOutput.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(container => container !== null);
        
        postgresRunning = containers.some(c => c.Service === 'db' && c.State === 'running');
        n8nRunning = containers.some(c => c.Service === 'n8n' && c.State === 'running');
      }
    } catch {
      // Si docker compose ps falla, intentar método alternativo
      try {
        const dockerPsOutput = execSync('docker ps --format "{{.Names}}"', { 
          encoding: 'utf8',
          cwd: projectRoot 
        });
        // Buscar contenedores que pertenezcan a este proyecto (basado en nombre del directorio)
        const projectName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9]/g, '');
        postgresRunning = dockerPsOutput.includes('db') && dockerPsOutput.includes(projectName);
        n8nRunning = dockerPsOutput.includes('n8n') && dockerPsOutput.includes(projectName);
      } catch {
        // Si ambos métodos fallan, asumimos que no hay servicios corriendo
      }
    }
    
    // Si falta algún servicio, iniciar docker compose
    if (!postgresRunning || !n8nRunning) {
      console.log(warning('⚠️  Servicios Docker no detectados, intentando iniciar con Docker Compose...'));
      try {
        execSync('docker compose up -d', { 
          stdio: 'inherit',
          cwd: projectRoot 
        });
        console.log(success('✅ Servicios Docker iniciados (PostgreSQL y N8N)\n'));
      } catch (err) {
        console.log(warning('⚠️  No se pudo iniciar Docker automáticamente'));
        console.log(warning('   Ejecuta manualmente: docker compose up -d\n'));
      }
    } else {
      if (postgresRunning) console.log(success('✅ PostgreSQL detectado'));
      if (n8nRunning) console.log(success('✅ N8N detectado'));
      console.log('');
    }
  } catch (err) {
    console.log(warning('⚠️  Error al verificar servicios Docker:'), err.message);
    console.log('');
  }
}

/**
 * AI_DECISION: Sistema de cache para validaciones predev
 * Justificación: Validaciones pesadas (Docker, PostgreSQL, Python) no cambian frecuentemente
 * Impacto: Reduce tiempo de inicio de 5-10s a <1s cuando cache es válido
 */
function getValidationCache() {
  try {
    if (fs.existsSync(validationCacheFile)) {
      const cache = JSON.parse(fs.readFileSync(validationCacheFile, 'utf8'));
      const age = Date.now() - cache.timestamp;
      if (age < VALIDATION_CACHE_TTL) {
        return cache;
      }
    }
  } catch {
    // Ignorar errores de cache
  }
  return null;
}

function setValidationCache(result) {
  try {
    fs.writeFileSync(validationCacheFile, JSON.stringify({
      timestamp: Date.now(),
      result
    }), 'utf8');
  } catch {
    // Ignorar errores de escritura de cache
  }
}

/**
 * Ejecutar validaciones antes de iniciar (optimizado con cache)
 */
async function runValidations(skipCache = false) {
  // AI_DECISION: Usar cache para validaciones si está disponible y es válido
  // Justificación: Validaciones de dependencias no cambian frecuentemente
  // Impacto: Reduce tiempo de inicio significativamente en ejecuciones consecutivas
  if (!skipCache) {
    const cache = getValidationCache();
    if (cache && cache.result === 'success') {
      console.log(info('⚡ Usando cache de validaciones (ejecutado hace <5min)\n'));
      return;
    }
  }
  
  console.log(bold.cyan('\n🔍 Ejecutando validaciones pre-inicio...\n'));
  
  let validationResult = 'success';
  
  try {
    // Validar dependencias (solo críticas: Node, pnpm, PostgreSQL básico)
    console.log(info('1️⃣  Validando dependencias críticas...'));
    try {
      // Ejecutar validación pero capturar errores para no salir inmediatamente
      execSync('node scripts/dev-validate-deps.js --fast', { 
        stdio: 'inherit',
        cwd: projectRoot,
        timeout: 10000 // Timeout de 10s para evitar cuelgues
      });
    } catch (err) {
      // Si hay errores críticos, el script ya los mostró y salió con código 1
      if (err.status === 1) {
        validationResult = 'error';
      }
    }
    console.log('');
    
    // Validar variables de entorno (rápido, solo lectura de archivos)
    console.log(info('2️⃣  Validando variables de entorno...'));
    try {
      execSync('node scripts/dev-validate-env.js', { 
        stdio: 'inherit',
        cwd: projectRoot,
        timeout: 5000 // Timeout de 5s
      });
    } catch (err) {
      // Si hay errores críticos, el script ya los mostró
      if (err.status === 1) {
        validationResult = 'error';
        console.log(warning('\n⚠️  Hay problemas con las variables de entorno'));
        console.log(warning('   El sistema puede no funcionar correctamente'));
        console.log(warning('   Ejecuta: pnpm setup para configurar el proyecto\n'));
      }
    }
    console.log('');
    
    // Verificar que .env existe (verificación adicional)
    const envPath = path.join(projectRoot, 'apps', 'api', '.env');
    if (!fs.existsSync(envPath)) {
      console.log(warning('⚠️  Archivo apps/api/.env no encontrado'));
      console.log(warning('   Ejecuta: pnpm setup para configurar el proyecto'));
      console.log(warning('   O copia manualmente: cp apps/api/config-example.env apps/api/.env\n'));
      validationResult = 'warning';
    }
    
    // Advertencia sobre tokens viejos (solo informativo)
    console.log(info('3️⃣  Verificando configuración...'));
    console.log(info('   💡 Si encuentras errores 401 o problemas de autenticación:'));
    console.log(info('      - Limpia las cookies del navegador para localhost'));
    console.log(info('      - O usa modo incógnito para evitar tokens viejos\n'));
    
    if (validationResult === 'success') {
      console.log(success('✅ Validaciones completadas\n'));
      setValidationCache('success');
    } else if (validationResult === 'error') {
      console.log(error('❌ Validaciones fallaron - corrige los errores antes de continuar\n'));
      setValidationCache('error');
      // No salir aquí, permitir que el usuario decida si continuar
    } else {
      console.log(warning('⚠️  Validaciones completadas con advertencias\n'));
      setValidationCache('warning');
    }
    
  } catch (err) {
    console.log(error('❌ Error durante las validaciones:'), err.message);
    console.log(warning('   Continuando de todas formas...\n'));
    setValidationCache('error');
  }
}

/**
 * Función principal
 */
async function main() {
  console.log(bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
  console.log(bold.cyan('║     CACTUS CRM - Modo Desarrollo                        ║'));
  console.log(bold.cyan('╚═══════════════════════════════════════════════════════════╝'));
  console.log('');

  if (analyticsPort !== DEFAULT_ANALYTICS_PORT) {
    console.log(
      warning(
        `⚠️  Puerto 3002 no está disponible. Analytics usará el puerto ${analyticsPort}.`
      )
    );
    console.log('');
  }
  
  // Limpiar archivos PID stale de Turbo antes de iniciar
  const hadStalePids = cleanTurboStalePids();
  
  // Reiniciar daemon de Turbo si se encontraron PID stale
  // Esto asegura que el cache funcione correctamente
  if (hadStalePids) {
    restartTurboDaemon();
  }
  
  // Siempre verificar servicios Docker (independiente de validaciones)
  ensureDockerServices();
  
  // Ejecutar validaciones (opcional, puede ser deshabilitado con --skip-validation)
  const skipValidation = process.argv.includes('--skip-validation');
  const skipCache = process.argv.includes('--no-cache');
  
  if (!skipValidation) {
    await runValidations(skipCache);
  } else {
    console.log(warning('⚠️  Validaciones omitidas (--skip-validation)\n'));
  }
  
  if (isWindows) {
    // Windows: Usar turbo run dev (sin consola unificada)
    console.log(bold('🚀 Iniciando servicios...\n'));
    
    try {
      // Ejecutar turbo run dev --parallel
      execSync('pnpm turbo run dev --parallel', {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (err) {
      // Ctrl+C es normal, solo salir
      if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
        console.log('\n' + info('👋 Saliendo...'));
        process.exit(0);
      }
      process.exit(1);
    }
  } else {
    // Unix/Linux/macOS: Usar script unificado con consola única y logs coloreados
    const unifiedScript = path.join(projectRoot, 'scripts', 'dev-unified.js');
    
    if (fs.existsSync(unifiedScript)) {
      console.log(bold('🚀 Iniciando servicios...\n'));
      try {
        execSync(`node "${unifiedScript}"`, {
          stdio: 'inherit',
          cwd: projectRoot
        });
      } catch (err) {
        // Ctrl+C es normal, solo salir
        if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
          console.log('\n' + info('👋 Saliendo...'));
          process.exit(0);
        }
        process.exit(1);
      }
    } else {
      // Fallback a turbo run dev si el script no existe
      console.log(warning('⚠️  Script unificado no encontrado. Usando modo básico (turbo run dev)...'));
      console.log('');
      
      try {
        execSync('pnpm turbo run dev --parallel', {
          stdio: 'inherit',
          cwd: projectRoot
        });
      } catch (err) {
        // Ctrl+C es normal, solo salir
        if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
          console.log('\n' + info('👋 Saliendo...'));
          process.exit(0);
        }
        process.exit(1);
      }
    }
  }
}

// Ejecutar función principal
main().catch((err) => {
  // Usar la variable error definida arriba, o fallback a string simple
  try {
    console.error(error('❌ Error fatal:'), err);
  } catch {
    console.error('❌ Error fatal:', err);
  }
  process.exit(1);
});

