#!/usr/bin/env node

/**
 * Script wrapper para desarrollo cross-platform
 * Detecta el OS y ejecuta el comando apropiado
 * Incluye validaciones pre-inicio y health checks
 */

const { execSync, exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const {
  resolveAnalyticsPort,
  buildAnalyticsServiceUrl,
  DEFAULT_ANALYTICS_PORT,
} = require('./utils/analytics-port');

const execAsync = util.promisify(exec);

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const validationCacheFile = path.join(projectRoot, '.dev-validation-cache.json');
const dockerCacheFile = path.join(projectRoot, '.dev-docker-cache.json');
const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const DOCKER_CACHE_TTL = 60 * 60 * 1000; // 1 hora (Docker es estable)

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;
const dim = chalk.dim;

const analyticsPort = resolveAnalyticsPort();
const analyticsUrl = buildAnalyticsServiceUrl(analyticsPort);

process.env.ANALYTICS_PORT = String(analyticsPort);
process.env.ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || analyticsUrl;
process.env.PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || analyticsUrl;

/**
 * Limpiar archivos PID stale de Turbo
 */
function cleanTurboStalePids() {
  try {
    const os = require('os');
    const tmpDir = os.tmpdir();
    const turbodDir = path.join(tmpDir, 'turbod');

    if (!fs.existsSync(turbodDir)) return false;

    const entries = fs.readdirSync(turbodDir, { withFileTypes: true });
    let foundStalePids = false;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pidFile = path.join(turbodDir, entry.name, 'turbod.pid');
        if (fs.existsSync(pidFile)) {
          try {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
            if (pid && !isProcessRunning(pid)) {
              foundStalePids = true;
              try {
                fs.unlinkSync(pidFile);
                const sockFile = path.join(turbodDir, entry.name, 'turbod.sock');
                if (fs.existsSync(sockFile)) fs.unlinkSync(sockFile);
              } catch {}
            }
          } catch {}
        }
      }
    }
    return foundStalePids;
  } catch {
    return false;
  }
}

function restartTurboDaemon() {
  try {
    try {
      execSync('pnpm turbo daemon stop', { stdio: 'ignore', cwd: projectRoot });
    } catch {}
    cleanTurboStalePids();
    execSync('pnpm turbo daemon start', { stdio: 'ignore', cwd: projectRoot });
  } catch {}
}

function isProcessRunning(pid) {
  try {
    if (isWindows) {
      const output = execSync(`tasklist /FI "PID eq ${pid}"`, { encoding: 'utf8', stdio: 'pipe' });
      return output.includes(String(pid));
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

// --- Caching System ---

function getCache(file, ttl) {
  try {
    if (fs.existsSync(file)) {
      const cache = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Date.now() - cache.timestamp < ttl) return cache;
    }
  } catch {}
  return null;
}

function setCache(file, result) {
  try {
    fs.writeFileSync(file, JSON.stringify({ timestamp: Date.now(), result }), 'utf8');
  } catch {}
}

// --- Docker Services ---

async function ensureDockerServices() {
  // Check cache first
  const cache = getCache(dockerCacheFile, DOCKER_CACHE_TTL);
  if (cache && cache.result === 'success') {
    return; // Docker services assumed running
  }

  process.stdout.write(info('🗄️  Verificando servicios Docker... '));

  try {
    // Check docker version first (fast)
    try {
      await execAsync('docker --version', { cwd: projectRoot });
    } catch {
      console.log(warning('\n⚠️  Docker no disponible.'));
      return;
    }

    // Check running containers
    let postgresRunning = false;

    try {
      const { stdout } = await execAsync('docker compose ps --format json', { cwd: projectRoot });
      if (stdout.trim()) {
        const containers = stdout
          .trim()
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter((c) => c);

        postgresRunning = containers.some((c) => c.Service === 'db' && c.State === 'running');
      }
    } catch {
      // Fallback
      try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}"', { cwd: projectRoot });
        const projectName = path
          .basename(projectRoot)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        postgresRunning = stdout.includes('db') && stdout.includes(projectName);
      } catch {}
    }

    if (!postgresRunning) {
      console.log(warning('\n⚠️  Iniciando servicios...'));
      try {
        execSync('docker compose up -d', { stdio: 'inherit', cwd: projectRoot });
        console.log(success('✅ Servicios iniciados'));
        setCache(dockerCacheFile, 'success');
      } catch {
        console.log(warning('⚠️  Fallo al iniciar Docker. Ejecuta: docker compose up -d'));
      }
    } else {
      console.log(success('OK'));
      setCache(dockerCacheFile, 'success');
    }
  } catch (err) {
    console.log(warning(`\n⚠️  Error Docker: ${err.message}`));
  }
}

// --- Validations ---

async function runValidations(skipCache = false) {
  if (!skipCache) {
    const cache = getCache(validationCacheFile, VALIDATION_CACHE_TTL);
    if (cache && cache.result === 'success') {
      console.log(dim('⚡ Validaciones en cache'));
      return;
    }
  }

  console.log(dim('🔍 Validando entorno...'));

  // Run validations in parallel
  try {
    const [depsResult, envResult] = await Promise.allSettled([
      execAsync('node scripts/dev-validate-deps.js --fast', { cwd: projectRoot }),
      execAsync('node scripts/dev-validate-env.js', { cwd: projectRoot }),
    ]);

    let failed = false;

    if (depsResult.status === 'rejected') {
      console.log(error('❌ Error dependencias'));
      failed = true;
    }

    if (envResult.status === 'rejected') {
      console.log(warning('⚠️  Advertencia variables de entorno'));
      // Env failure is often not fatal in dev if fallback exists
    }

    // Check .env file
    const envPath = path.join(projectRoot, 'apps', 'api', '.env');
    if (!fs.existsSync(envPath)) {
      console.log(warning('⚠️  Falta apps/api/.env'));
      failed = true;
    }

    if (!failed) {
      setCache(validationCacheFile, 'success');
    }
  } catch (err) {
    console.log(error(`❌ Error validación: ${err.message}`));
  }

  // AI_DECISION: Asegurar existencia de .env básico
  // Justificación: Evita que el servidor API falle al iniciar por falta de configuración
  // Impacto: Onboarding más fluido para nuevos desarrolladores
  const apiEnvPath = path.join(projectRoot, 'apps', 'api', '.env');
  const apiEnvExamplePath = path.join(projectRoot, 'apps', 'api', 'config-example.env');

  if (!fs.existsSync(apiEnvPath) && fs.existsSync(apiEnvExamplePath)) {
    console.log(info('📝 Creando apps/api/.env desde el ejemplo...'));
    try {
      fs.copyFileSync(apiEnvExamplePath, apiEnvPath);
      console.log(success('✅ .env creado con éxito'));
    } catch (err) {
      console.log(warning('⚠️  No se pudo crear .env automáticamente.'));
    }
  }
}

async function main() {
  console.log(bold.cyan('MAATWORK v0.1.0 (Dev Mode)'));

  if (analyticsPort !== DEFAULT_ANALYTICS_PORT) {
    console.log(warning(`Analytics port: ${analyticsPort}`));
  }

  // AI_DECISION: Asegurar que los paquetes críticos estén construidos
  // Justificación: Evita errores de "Module not found" al iniciar apps que dependen de @maatwork/ui o @maatwork/db
  // Impacto: Inicio más robusto y consistente
  try {
    const uiDist = path.join(projectRoot, 'packages', 'ui', 'dist');
    const dbDist = path.join(projectRoot, 'packages', 'db', 'dist');
    const typesDist = path.join(projectRoot, 'packages', 'types', 'dist');

    if (!fs.existsSync(uiDist) || !fs.existsSync(dbDist) || !fs.existsSync(typesDist)) {
      console.log(info('🏗️  Detectando paquetes sin construir. Preparando entorno...'));
      execSync(
        'pnpm turbo run build --filter=@maatwork/ui --filter=@maatwork/db --filter=@maatwork/types',
        {
          stdio: 'inherit',
          cwd: projectRoot,
        }
      );
    }
  } catch (err) {
    console.log(warning('⚠️  Error al pre-construir paquetes, intentando continuar...'));
  }

  // Cleanup & Restart Turbo (fast)
  const hadStale = cleanTurboStalePids();
  if (hadStale) restartTurboDaemon();

  // Run checks in parallel where possible
  const skipValidation = process.argv.includes('--skip-validation');
  const skipCache = process.argv.includes('--no-cache');

  if (!skipValidation) {
    await Promise.all([ensureDockerServices(), runValidations(skipCache)]);
  }

  console.log(bold('🚀 Iniciando...'));

  // Command construction
  const turboCmd = 'pnpm turbo run dev --parallel';

  if (isWindows) {
    try {
      execSync(turboCmd, { stdio: 'inherit', cwd: projectRoot });
    } catch (err) {
      if (err.signal !== 'SIGINT' && err.signal !== 'SIGTERM') process.exit(1);
    }
  } else {
    // Unix/Linux/macOS
    const unifiedScript = path.join(projectRoot, 'scripts', 'dev-unified.js');
    const cmd = fs.existsSync(unifiedScript) ? `node "${unifiedScript}"` : turboCmd;

    try {
      execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
    } catch (err) {
      if (err.signal !== 'SIGINT' && err.signal !== 'SIGTERM') process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(error('❌ Fatal:'), err);
  process.exit(1);
});
