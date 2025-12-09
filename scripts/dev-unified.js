#!/usr/bin/env node

/**
 * Script unificado de desarrollo para Cactus CRM
 * Ejecuta todos los servicios en una única consola con logs coloreados y organizados
 * Reemplaza el sistema tmux anterior con una solución más simple y visual
 */

const { spawn } = require('child_process');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const {
  resolveAnalyticsPort,
  buildAnalyticsServiceUrl,
  DEFAULT_ANALYTICS_PORT
} = require('./utils/analytics-port');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;

// Colores para prefijos de servicios
const apiColor = chalk.green.bold;
const webColor = chalk.blue.bold;
const analyticsColor = chalk.cyan.bold;

const analyticsPort = resolveAnalyticsPort();
const analyticsUrl = buildAnalyticsServiceUrl(analyticsPort);

process.env.ANALYTICS_PORT = String(analyticsPort);
process.env.ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || analyticsUrl;
process.env.PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || analyticsUrl;

// Procesos hijos
const processes = [];

/**
 * Función para health check con retry
 */
function healthCheck(url, name, maxRetries = 15, retryDelay = 2000) {
  return new Promise((resolve) => {
    const http = require('http');
    let attempts = 0;

    const check = () => {
      attempts++;
      const req = http.get(url, { timeout: 1000 }, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve(true);
            return;
          }
          if (attempts < maxRetries) {
            setTimeout(check, retryDelay);
          } else {
            resolve(false);
          }
        });
      });

      req.on('error', () => {
        if (attempts < maxRetries) {
          setTimeout(check, retryDelay);
        } else {
          resolve(false);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (attempts < maxRetries) {
          setTimeout(check, retryDelay);
        } else {
          resolve(false);
        }
      });
    };

    check();
  });
}

/**
 * Formatear línea de log con prefijo de color
 */
function formatLogLine(service, color, line) {
  const prefix = color(`[${service}]`);
  return `${prefix} ${line}`;
}

/**
 * Iniciar proceso hijo con manejo de streams
 */
function startProcess(name, command, args, options, color) {
  const child = spawn(command, args, {
    ...options,
    cwd: options.cwd || projectRoot,
    env: {
      ...process.env,
      ...options.env,
      FORCE_COLOR: '1', // Forzar colores
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Buffer para logs iniciales
  let stdoutBuffer = '';
  let stderrBuffer = '';

  // Capturar stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        stdoutBuffer += line + '\n';
        console.log(formatLogLine(name, color, line));
      }
    });
  });

  // Capturar stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        stderrBuffer += line + '\n';
        // stderr puede ser warnings o errores, usar color apropiado
        if (line.toLowerCase().includes('error')) {
          console.error(formatLogLine(name, error, line));
        } else {
          console.log(formatLogLine(name, color, line));
        }
      }
    });
  });

  child.on('error', (err) => {
    console.error(
      formatLogLine(name, error, `Error al iniciar: ${err.message}`)
    );
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(
        formatLogLine(
          name,
          error,
          `Proceso terminado con código ${code}${signal ? ` (señal: ${signal})` : ''}`
        )
      );
    }
  });

  processes.push({ name, process: child });
  return child;
}

/**
 * Limpiar todos los procesos al salir
 */
function cleanup() {
  console.log('');
  console.log(warning('🛑 Deteniendo todos los servicios...'));
  console.log('');

  processes.forEach(({ name, process: proc }) => {
    try {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        // Si no responde en 2 segundos, forzar
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 2000);
      }
    } catch (err) {
      // Ignorar errores al limpiar
    }
  });

  // Dar tiempo para que los procesos terminen
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

// Capturar señales de terminación
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Función principal
 */
async function main() {
  // Banner
  console.log('');
  console.log(bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
  console.log(bold.cyan('║     CACTUS CRM - Modo Desarrollo (Consola Unificada)    ║'));
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

  console.log(info('🚀 Iniciando servicios...'));
  console.log('');

  // Iniciar API
  console.log(apiColor('📡 Iniciando API en puerto 3001...'));
  startProcess(
    'API',
    'pnpm',
    ['-F', '@cactus/api', 'dev'],
    {
      cwd: projectRoot,
      env: {
        NODE_ENV: 'development',
      },
    },
    apiColor
  );

  // Pequeño delay antes de iniciar Web
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Iniciar Web
  console.log(webColor('🌐 Iniciando Web App en puerto 3000...'));
  startProcess(
    'Web',
    'pnpm',
    ['-F', '@cactus/web', 'dev'],
    {
      cwd: projectRoot,
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
    },
    webColor
  );

  // Pequeño delay antes de iniciar Analytics
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Iniciar Analytics (opcional, puede fallar si Python no está disponible)
  console.log(analyticsColor(`📊 Iniciando Analytics Service en puerto ${analyticsPort}...`));
  startProcess(
    'Analytics',
    'node',
    [path.join(__dirname, 'run-python-service.js')],
    {
      cwd: projectRoot,
      env: {
        ANALYTICS_PORT: String(analyticsPort),
        PYTHONUNBUFFERED: '1',
      },
    },
    analyticsColor
  );

  // Esperar un poco para que los servicios se inicien
  console.log('');
  console.log(info('⏳ Esperando que los servicios se inicien...'));
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Health checks
  console.log('');
  console.log(bold('🏥 Verificando salud de los servicios...'));
  console.log('');

  // Health check API
  console.log(info('🔍 Verificando API (http://localhost:3001/health)...'));
  const apiHealthy = await healthCheck('http://localhost:3001/health', 'API');
  if (apiHealthy) {
    console.log(success('  ✅ API está funcionando'));
  } else {
    console.log(warning('  ⚠️  API aún no responde (puede estar iniciando)'));
  }
  console.log('');

  // Health check Web
  console.log(info('🔍 Verificando Web App (http://localhost:3000)...'));
  const webHealthy = await healthCheck('http://localhost:3000', 'Web', 20);
  if (webHealthy) {
    console.log(success('  ✅ Web App está funcionando'));
  } else {
    console.log(warning('  ⚠️  Web App aún no responde (puede estar iniciando)'));
  }
  console.log('');

  // Health check Analytics (opcional)
  console.log(info(`🔍 Verificando Analytics Service (${analyticsUrl}/health)...`));
  const analyticsHealthy = await healthCheck(
    `${analyticsUrl}/health`,
    'Analytics',
    5
  );
  if (analyticsHealthy) {
    console.log(success('  ✅ Analytics Service está funcionando'));
  } else {
    console.log(warning('  ⚠️  Analytics Service no disponible (opcional)'));
  }
  console.log('');

  // Información final
  console.log(bold.yellow('📋 URLs de acceso:'));
  console.log(`  • Web App:     ${info('http://localhost:3000')}`);
  console.log(`  • API:         ${info('http://localhost:3001')}`);
  console.log(`  • API Health:  ${info('http://localhost:3001/health')}`);
  console.log(`  • Analytics:   ${info(analyticsUrl)} ${warning('(opcional)')}`);
  console.log('');
  console.log(bold.yellow('⌨️  Comandos:'));
  console.log(`  • Detener:     ${info('Ctrl+C')}`);
  console.log('');
  console.log(bold.green('✅ Todos los servicios están corriendo. Logs en vivo abajo:'));
  console.log('');
  console.log('─'.repeat(60));
  console.log('');

  // Mantener el proceso vivo
  // Los procesos hijos se manejan automáticamente
}

// Ejecutar función principal
main().catch((err) => {
  console.error(error('❌ Error fatal:'), err);
  cleanup();
  process.exit(1);
});






