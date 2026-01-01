#!/usr/bin/env tsx
/**
 * Setup Check - Verificación de prerequisitos
 *
 * Verifica que todas las dependencias y servicios estén disponibles
 * antes de ejecutar el setup o desarrollo.
 *
 * @example
 * pnpm tsx scripts/setup-check.ts
 */

import { logger, exec, config, paths, pathExists } from './lib/index';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

const results: CheckResult[] = [];
let hasErrors = false;
let hasWarnings = false;

/**
 * Verificar Node.js
 */
function checkNodeVersion(): boolean {
  logger.info('Verificando Node.js...');

  const nodeVersion = process.version;
  const majorVersion = config.nodeMajorVersion;

  if (majorVersion >= 22 && majorVersion < 25) {
    results.push({
      name: 'Node.js',
      passed: true,
      message: `Node.js ${nodeVersion} (requerido: >=22.0.0 <25.0.0)`,
      critical: true,
    });
    logger.success(`Node.js ${nodeVersion}`);
    return true;
  } else {
    results.push({
      name: 'Node.js',
      passed: false,
      message: `Node.js ${nodeVersion} no cumple requisitos (>=22.0.0 <25.0.0)`,
      critical: true,
    });
    logger.error(`Node.js ${nodeVersion} - Se requiere >=22.0.0 <25.0.0`);
    hasErrors = true;
    return false;
  }
}

/**
 * Verificar pnpm
 */
function checkPnpm(): boolean {
  logger.info('Verificando pnpm...');

  const result = exec('pnpm --version', { silent: true, stdio: 'pipe' });

  if (result.success) {
    const version = result.stdout;
    const majorVersion = parseInt(version.split('.')[0], 10);

    if (majorVersion >= 9) {
      results.push({
        name: 'pnpm',
        passed: true,
        message: `pnpm ${version}`,
        critical: true,
      });
      logger.success(`pnpm ${version}`);
      return true;
    } else {
      results.push({
        name: 'pnpm',
        passed: false,
        message: `pnpm ${version} - Se requiere >=9.0.0`,
        critical: true,
      });
      logger.error(`pnpm ${version} - Se requiere >=9.0.0`);
      hasErrors = true;
      return false;
    }
  } else {
    results.push({
      name: 'pnpm',
      passed: false,
      message: 'pnpm no está instalado',
      critical: true,
    });
    logger.error('pnpm no está instalado. Instala con: npm install -g pnpm@latest');
    hasErrors = true;
    return false;
  }
}

/**
 * Verificar Docker
 */
function checkDocker(): boolean {
  logger.info('Verificando Docker...');

  const versionResult = exec('docker --version', { silent: true, stdio: 'pipe' });

  if (!versionResult.success) {
    results.push({
      name: 'Docker',
      passed: false,
      message: 'Docker no está instalado',
      critical: true,
    });
    logger.error('Docker no está instalado. Descarga desde: https://www.docker.com/products/docker-desktop');
    hasErrors = true;
    return false;
  }

  logger.success(`Docker instalado: ${versionResult.stdout}`);

  // Verificar si Docker está corriendo
  const psResult = exec('docker ps', { silent: true, stdio: 'pipe' });
  if (!psResult.success) {
    results.push({
      name: 'Docker',
      passed: false,
      message: 'Docker está instalado pero no está corriendo',
      critical: false,
    });
    logger.warn('Docker está instalado pero no está corriendo');
    hasWarnings = true;
    return false;
  }

  results.push({
    name: 'Docker',
    passed: true,
    message: 'Docker está corriendo',
    critical: true,
  });
  logger.success('Docker está corriendo');
  return true;
}

/**
 * Verificar PostgreSQL en Docker
 */
function checkPostgreSQL(): boolean {
  logger.info('Verificando PostgreSQL...');

  const result = exec('docker ps --format "{{.Names}}" | grep -i postgres', {
    silent: true,
    stdio: 'pipe',
  });

  if (result.success && result.stdout) {
    const containerName = result.stdout.split('\n')[0];
    results.push({
      name: 'PostgreSQL',
      passed: true,
      message: `PostgreSQL corriendo en Docker: ${containerName}`,
      critical: true,
    });
    logger.success(`PostgreSQL corriendo: ${containerName}`);
    return true;
  }

  // Verificar si docker-compose está disponible
  const composeResult = exec('docker compose version', { silent: true, stdio: 'pipe' });

  if (composeResult.success) {
    results.push({
      name: 'PostgreSQL',
      passed: false,
      message: 'PostgreSQL no está corriendo (puede iniciarse automáticamente)',
      critical: false,
    });
    logger.warn('PostgreSQL no está corriendo - El setup lo iniciará automáticamente');
    hasWarnings = true;
    return false;
  }

  results.push({
    name: 'PostgreSQL',
    passed: false,
    message: 'Docker Compose no disponible',
    critical: true,
  });
  logger.error('Docker Compose no está disponible');
  hasErrors = true;
  return false;
}

/**
 * Verificar archivo .env
 */
function checkEnvFile(): { exists: boolean; needsSetup: boolean } {
  logger.info('Verificando configuración de entorno...');

  const envPath = `${paths.apps.api}/.env`;
  const envExamplePath = `${paths.apps.api}/config-example.env`;

  if (pathExists(envPath)) {
    results.push({
      name: 'Configuración',
      passed: true,
      message: 'Archivo .env existe',
      critical: true,
    });
    logger.success('Archivo apps/api/.env existe');
    return { exists: true, needsSetup: false };
  } else {
    if (pathExists(envExamplePath)) {
      results.push({
        name: 'Configuración',
        passed: false,
        message: 'Archivo .env no existe (se creará automáticamente)',
        critical: false,
      });
      logger.warn('Archivo .env no existe - El setup lo creará');
      hasWarnings = true;
      return { exists: false, needsSetup: true };
    } else {
      results.push({
        name: 'Configuración',
        passed: false,
        message: 'Archivo config-example.env no encontrado',
        critical: true,
      });
      logger.error('Archivo config-example.env no encontrado');
      hasErrors = true;
      return { exists: false, needsSetup: false };
    }
  }
}

/**
 * Mostrar resumen
 */
function showSummary(): void {
  logger.newline();
  logger.subheader('Resumen de Verificación');

  for (const result of results) {
    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    const color = result.passed ? 'success' : result.critical ? 'error' : 'warn';
    logger[color](`${icon} ${result.name}: ${result.message}`);
  }

  logger.newline();
}

/**
 * Función principal
 */
export function main(): { hasErrors: boolean; hasWarnings: boolean; results: CheckResult[] } {
  logger.header('MAATWORK - Verificación de Prerequisitos');

  checkNodeVersion();
  checkPnpm();
  checkDocker();
  checkPostgreSQL();
  checkEnvFile();

  showSummary();

  if (hasErrors) {
    logger.error('Hay errores críticos que deben resolverse');
  } else if (hasWarnings) {
    logger.warn('Hay advertencias pero puedes continuar');
  } else {
    logger.success('Todos los prerequisitos están disponibles');
  }

  return { hasErrors, hasWarnings, results };
}

// Exportar funciones individuales para uso desde otros scripts
export {
  checkNodeVersion,
  checkPnpm,
  checkDocker,
  checkPostgreSQL,
  checkEnvFile,
};

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const { hasErrors: errors } = main();
  process.exit(errors ? 1 : 0);
}

