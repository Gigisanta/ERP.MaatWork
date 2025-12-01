#!/usr/bin/env node

/**
 * Script cross-platform para ejecutar el servicio Python analytics-service
 * Detecta Python disponible y ejecuta main.py con validación previa
 */

const { spawn } = require('child_process');
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
const analyticsServicePath = path.join(projectRoot, 'apps', 'analytics-service');
const mainPyPath = path.join(analyticsServicePath, 'main.py');
const analyticsPort = resolveAnalyticsPort();
const analyticsUrl = buildAnalyticsServiceUrl(analyticsPort);

const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

process.env.ANALYTICS_PORT = String(analyticsPort);
process.env.ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || analyticsUrl;
process.env.PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || analyticsUrl;

/**
 * Encontrar comando Python disponible
 */
function findPythonCommand() {
  const pythonCommands = isWindows 
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const { execSync } = require('child_process');
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      if (version.includes('Python 3')) {
        const majorVersion = parseInt(version.match(/Python (\d+)/)?.[1] || '0', 10);
        if (majorVersion >= 3) {
          return cmd;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Verificar que main.py existe
 */
function checkMainPy() {
  if (!fs.existsSync(mainPyPath)) {
    console.error(error(`❌ No se encontró main.py en ${analyticsServicePath}`));
    process.exit(1);
  }
}

/**
 * Ejecutar servicio Python
 */
function runPythonService() {
  const pythonCmd = findPythonCommand();
  
  if (!pythonCmd) {
    console.error(error('❌ Python no está instalado o no está en PATH'));
    console.error(error('   Instala Python 3.10+ desde https://www.python.org/downloads/'));
    console.error(warning('   El servicio continuará sin el servicio Python (usará fallback a DB)'));
    // No salir con error, permitir que otros servicios continúen
    process.exit(0);
  }

  checkMainPy();

  if (analyticsPort !== DEFAULT_ANALYTICS_PORT) {
    console.log(
      warning(
        `⚠️  Puerto 3002 no está disponible. Analytics se levantará en ${analyticsPort}.`
      )
    );
  }
  console.log(info(`🚀 Iniciando Analytics Service en puerto ${analyticsPort}...`));
  console.log(info(`   Usando: ${pythonCmd} main.py`));
  console.log('');

  // Cambiar al directorio del servicio
  process.chdir(analyticsServicePath);

  // Ejecutar Python
  const pythonProcess = spawn(pythonCmd, [mainPyPath], {
    cwd: analyticsServicePath,
    stdio: 'inherit',
    shell: isWindows
  });

  pythonProcess.on('error', (err) => {
    console.error(error(`❌ Error al ejecutar Python: ${err.message}`));
    console.error(warning('   El servicio continuará sin el servicio Python (usará fallback a DB)'));
    process.exit(0); // No bloquear otros servicios
  });

  pythonProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(error(`❌ Servicio Python terminó con código ${code}`));
      console.error(warning('   El servicio continuará sin el servicio Python (usará fallback a DB)'));
    }
    process.exit(code || 0);
  });

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    pythonProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    pythonProcess.kill('SIGTERM');
    process.exit(0);
  });
}

// Ejecutar
runPythonService();

