#!/usr/bin/env node

/**
 * Script cross-platform para ejecutar el servicio Python de analytics
 * Detecta el comando Python disponible y ejecuta main.py con la configuración correcta
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const { resolveAnalyticsPort } = require('./utils/analytics-port');

const isWindows = process.platform === 'win32';
const analyticsServicePath = path.resolve(__dirname, '..', 'apps', 'analytics-service');

/**
 * Encontrar comando Python disponible (Python 3.10+)
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
            return cmd;
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
 * Ejecutar el servicio de analytics
 */
function runAnalyticsService() {
  const pythonCmd = findPythonCommand();
  
  if (!pythonCmd) {
    console.error('❌ Python 3.10+ no está instalado o no está en PATH');
    console.error('   Instala Python desde https://www.python.org/downloads/');
    process.exit(1);
  }

  const analyticsPort = resolveAnalyticsPort();
  
  console.log(`🐍 Iniciando analytics-service con ${pythonCmd}`);
  console.log(`   Puerto: ${analyticsPort}`);
  console.log(`   Directorio: ${analyticsServicePath}`);
  console.log('');

  const env = {
    ...process.env,
    ANALYTICS_PORT: String(analyticsPort),
    PYTHONUNBUFFERED: '1', // Deshabilitar buffering para ver logs en tiempo real
  };

  const child = spawn(pythonCmd, ['main.py'], {
    cwd: analyticsServicePath,
    env,
    stdio: 'inherit',
    shell: isWindows, // Necesario en Windows para resolver comandos correctamente
  });

  child.on('error', (err) => {
    console.error(`❌ Error al iniciar el servicio: ${err.message}`);
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ El servicio terminó con código: ${code}`);
    }
    process.exit(code || 0);
  });

  // Manejar señales para terminar limpiamente
  const cleanup = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Ejecutar
runAnalyticsService();

