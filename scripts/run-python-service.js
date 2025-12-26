#!/usr/bin/env node

/**
 * Script cross-platform para ejecutar el servicio Python analytics-service
 * Busca Python, activa el entorno y ejecuta uvicorn
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const analyticsServicePath = path.join(projectRoot, 'apps', 'analytics-service');

const { resolveAnalyticsPort } = require('./utils/analytics-port');

const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

// Puerto y host del servicio
const HOST = process.env.ANALYTICS_HOST || '0.0.0.0';

/**
 * Encontrar comando Python disponible (3.10+)
 */
function findPythonCommand() {
  const pythonCommands = isWindows 
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      if (version.includes('Python 3')) {
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major >= 3 && minor >= 10) {
            return { cmd, version: version.trim() };
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Verificar si uvicorn está instalado
 */
function checkUvicorn(pythonCmd) {
  try {
    execSync(`${pythonCmd} -m uvicorn --version`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verificar dependencias críticas
 */
function checkDependencies(pythonCmd) {
  const pipCmd = `${pythonCmd} -m pip`;
  const criticalPackages = ['fastapi', 'uvicorn', 'yfinance'];
  
  for (const pkg of criticalPackages) {
    try {
      execSync(`${pipCmd} show ${pkg}`, { encoding: 'utf8', stdio: 'pipe' });
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Ejecutar el servicio con uvicorn
 */
function runService(pythonCmd) {
  const port = resolveAnalyticsPort();
  
  console.log(info(`🚀 Iniciando analytics-service en http://${HOST}:${port}`));
  console.log(info(`   Directorio: ${analyticsServicePath}`));
  console.log('');
  console.log(info('   Presiona Ctrl+C para detener'));
  console.log('');

  // Preparar comando uvicorn
  const uvicornArgs = [
    '-m', 'uvicorn',
    'main:app',
    '--host', HOST,
    '--port', String(port),
    '--reload'
  ];

  // Spawn el proceso
  const child = spawn(pythonCmd, uvicornArgs, {
    cwd: analyticsServicePath,
    stdio: 'inherit',
    shell: isWindows,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1'
    }
  });

  // Manejar señales de terminación
  const cleanup = () => {
    console.log('');
    console.log(info('🛑 Deteniendo analytics-service...'));
    child.kill('SIGTERM');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('error', (err) => {
    console.log(error(`❌ Error ejecutando el servicio: ${err.message}`));
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(error(`❌ El servicio terminó con código ${code}`));
    }
    process.exit(code ?? 0);
  });
}

/**
 * Función principal
 */
function main() {
  console.log('');
  console.log(info('🐍 Analytics Service Runner'));
  console.log(info('═'.repeat(40)));
  console.log('');

  // Verificar Python
  const python = findPythonCommand();
  if (!python) {
    console.log(error('❌ Python 3.10+ no está instalado o no está en PATH'));
    console.log(error('   Instala Python desde https://www.python.org/downloads/'));
    process.exit(1);
  }

  console.log(success(`✅ ${python.version}`));

  // Verificar dependencias
  if (!checkDependencies(python.cmd)) {
    console.log(warning('⚠️  Dependencias Python no instaladas. Ejecuta: pnpm -F @maatwork/analytics-service install'));
    process.exit(1);
  }

  // Verificar uvicorn
  if (!checkUvicorn(python.cmd)) {
    console.log(error('❌ uvicorn no está instalado'));
    process.exit(1);
  }

  // Ejecutar el servicio
  runService(python.cmd);
}

// Ejecutar
main();





































