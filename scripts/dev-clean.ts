#!/usr/bin/env tsx
/**
 * Dev Clean - Limpieza del entorno de desarrollo
 *
 * Mata procesos y libera puertos de desarrollo.
 * Cross-platform: Windows/macOS/Linux.
 *
 * @example
 * pnpm tsx scripts/dev-clean.ts
 * pnpm tsx scripts/dev-clean.ts --quiet
 */

import { logger, exec, config, sleep } from './lib/index';

const isQuiet = process.argv.includes('--quiet') || config.isCI;

// Configuración de puertos
const analyticsPort = config.analyticsPort;
const CRITICAL_PORTS = [3000, 3001, analyticsPort];

/**
 * Obtener PIDs usando un puerto específico
 */
function getPidsOnPort(port: number): number[] {
  const pids = new Set<number>();

  try {
    if (config.isWindows) {
      const result = exec(`netstat -ano | findstr ":${port}"`, { silent: true, stdio: 'pipe' });
      if (result.success) {
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (pid > 0) pids.add(pid);
          }
        }
      }
    } else {
      const result = exec(`lsof -ti :${port}`, { silent: true, stdio: 'pipe' });
      if (result.success) {
        const lines = result.stdout.trim().split('\n');
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (pid > 0) pids.add(pid);
        }
      }
    }
  } catch {
    // No processes found - this is fine
  }

  return Array.from(pids);
}

/**
 * Matar un proceso por PID
 */
function killProcess(pid: number): boolean {
  try {
    if (config.isWindows) {
      exec(`taskkill /F /T /PID ${pid}`, { silent: true, stdio: 'pipe' });
    } else {
      exec(`kill -9 ${pid}`, { silent: true, stdio: 'pipe' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Matar procesos que coincidan con un patrón
 */
function killProcessesByPattern(pattern: string): void {
  try {
    if (config.isWindows) {
      const result = exec(`wmic process where "CommandLine like '%${pattern}%'" get ProcessId`, {
        silent: true,
        stdio: 'pipe',
      });
      if (result.success) {
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (pid > 0 && !isNaN(pid)) {
            killProcess(pid);
          }
        }
      }
    } else {
      exec(`pkill -f "${pattern}"`, { silent: true, stdio: 'pipe' });
    }
  } catch {
    // No matching processes - this is fine
  }
}

/**
 * Verificar si un puerto está libre
 */
function isPortFree(port: number): boolean {
  return getPidsOnPort(port).length === 0;
}

/**
 * Liberar un puerto con reintentos
 */
async function freePort(port: number, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pids = getPidsOnPort(port);

    if (pids.length === 0) {
      return true;
    }

    if (attempt === 1 && !isQuiet) {
      logger.info(`Matando procesos en puerto ${port}...`);
    }

    for (const pid of pids) {
      killProcess(pid);
    }

    // Esperar a que los procesos terminen
    const waitMs = config.isWindows ? 1500 : 500;
    await sleep(waitMs);

    if (isPortFree(port)) {
      return true;
    }

    if (attempt < maxRetries && !isQuiet) {
      logger.warn(`Reintento ${attempt}/${maxRetries} para puerto ${port}...`);
    }
  }

  return isPortFree(port);
}

/**
 * Función principal de limpieza
 */
async function cleanEnvironment(): Promise<void> {
  if (!isQuiet) {
    logger.info('Limpiando entorno de desarrollo...');
  }

  // Matar procesos comunes de desarrollo
  if (!isQuiet) {
    logger.info('Deteniendo procesos de desarrollo...');
  }

  const patterns = ['next dev', 'tsx watch', 'node dist/', 'analytics-service', 'uvicorn'];

  for (const pattern of patterns) {
    killProcessesByPattern(pattern);
  }

  // Esperar a que los procesos terminen
  await sleep(config.isWindows ? 1500 : 1000);

  // Liberar puertos críticos
  if (!isQuiet) {
    logger.info('Liberando puertos de desarrollo...');
  }

  let allCriticalFree = true;
  const results: Array<{ port: number; freed: boolean }> = [];

  for (const port of CRITICAL_PORTS) {
    const freed = await freePort(port);
    results.push({ port, freed });
    if (!freed) allCriticalFree = false;
  }

  // Reportar resultados
  if (!isQuiet) {
    logger.subheader('Estado de puertos');
    for (const { port, freed } of results) {
      if (freed) {
        logger.success(`Puerto ${port} libre`);
      } else {
        logger.error(`Puerto ${port} aún en uso`);
      }
    }
  }

  if (allCriticalFree) {
    if (!isQuiet) {
      logger.success('Entorno limpiado exitosamente');
    }
    process.exit(0);
  } else {
    if (!isQuiet) {
      logger.error('Algunos puertos críticos siguen en uso');
      logger.info(`Puertos críticos: ${CRITICAL_PORTS.join(', ')}`);
    }
    process.exit(1);
  }
}

// Ejecutar
cleanEnvironment();

