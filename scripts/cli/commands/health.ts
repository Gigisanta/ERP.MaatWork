/**
 * Comando: health
 *
 * Verificación completa de la salud del proyecto.
 */

import { Command } from 'commander';
import {
  logger,
  exec,
  execAsync,
  paths,
  config,
  pathExists,
  commandExists,
  getRepoInfo,
  withSpinner,
  colors,
} from '../../lib/index';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

export const healthCommand = new Command('health')
  .description('Verificar salud del proyecto')
  .option('--full', 'Verificación completa (incluye build y tests)')
  .option('--fix', 'Intentar corregir problemas automáticamente')
  .option('--json', 'Output en formato JSON')
  .action(async (options) => {
    if (!options.json) {
      logger.header('MAATWORK - Health Check');
    }

    const checks: HealthCheck[] = [];

    // 1. Verificaciones del sistema
    checks.push(...checkSystem());

    // 2. Verificaciones de dependencias
    checks.push(...checkDependencies());

    // 3. Verificaciones de configuración
    checks.push(...checkConfiguration());

    // 4. Verificaciones de git
    checks.push(...checkGit());

    // 5. Verificaciones de servicios
    checks.push(...(await checkServices()));

    // 6. Verificaciones de build (si --full)
    if (options.full) {
      checks.push(...(await checkBuild()));
      checks.push(...(await checkTests()));
    }

    // Mostrar resultados
    if (options.json) {
      console.log(JSON.stringify(checks, null, 2));
    } else {
      displayResults(checks);
    }

    // Intentar corregir si --fix
    if (options.fix) {
      await attemptFixes(checks);
    }

    // Exit code basado en resultados
    const hasFails = checks.some((c) => c.status === 'fail');
    process.exit(hasFails ? 1 : 0);
  });

function checkSystem(): HealthCheck[] {
  const checks: HealthCheck[] = [];

  // Node.js
  const nodeMajor = config.nodeMajorVersion;
  if (nodeMajor >= 22 && nodeMajor < 25) {
    checks.push({
      name: 'Node.js',
      status: 'pass',
      message: `v${process.version} (OK)`,
    });
  } else {
    checks.push({
      name: 'Node.js',
      status: 'fail',
      message: `v${process.version} (requiere >=22 <25)`,
      fix: 'Instala Node.js 22 o 23',
    });
  }

  // pnpm
  const pnpmResult = exec('pnpm --version', { silent: true, stdio: 'pipe' });
  if (pnpmResult.success) {
    const version = pnpmResult.stdout;
    const major = parseInt(version.split('.')[0], 10);
    if (major >= 9) {
      checks.push({
        name: 'pnpm',
        status: 'pass',
        message: `v${version} (OK)`,
      });
    } else {
      checks.push({
        name: 'pnpm',
        status: 'fail',
        message: `v${version} (requiere >=9)`,
        fix: 'npm install -g pnpm@latest',
      });
    }
  } else {
    checks.push({
      name: 'pnpm',
      status: 'fail',
      message: 'No instalado',
      fix: 'npm install -g pnpm@latest',
    });
  }

  // Docker
  if (commandExists('docker')) {
    const dockerPs = exec('docker ps', { silent: true, stdio: 'pipe' });
    if (dockerPs.success) {
      checks.push({
        name: 'Docker',
        status: 'pass',
        message: 'Instalado y corriendo',
      });
    } else {
      checks.push({
        name: 'Docker',
        status: 'warn',
        message: 'Instalado pero no está corriendo',
        fix: 'Inicia Docker Desktop',
      });
    }
  } else {
    checks.push({
      name: 'Docker',
      status: 'warn',
      message: 'No instalado',
      fix: 'Instala Docker Desktop',
    });
  }

  return checks;
}

function checkDependencies(): HealthCheck[] {
  const checks: HealthCheck[] = [];

  // node_modules
  if (existsSync(join(paths.root, 'node_modules'))) {
    checks.push({
      name: 'node_modules',
      status: 'pass',
      message: 'Instalados',
    });
  } else {
    checks.push({
      name: 'node_modules',
      status: 'fail',
      message: 'No instalados',
      fix: 'pnpm install',
    });
  }

  // Paquetes construidos
  const packagesToCheck = [
    { name: '@maatwork/ui', path: join(paths.packages.ui, 'dist') },
    { name: '@maatwork/db', path: join(paths.packages.db, 'dist') },
    { name: '@maatwork/types', path: join(paths.packages.types, 'dist') },
  ];

  for (const pkg of packagesToCheck) {
    if (existsSync(pkg.path)) {
      checks.push({
        name: `Build ${pkg.name}`,
        status: 'pass',
        message: 'Construido',
      });
    } else {
      checks.push({
        name: `Build ${pkg.name}`,
        status: 'warn',
        message: 'No construido',
        fix: `pnpm -F ${pkg.name} build`,
      });
    }
  }

  return checks;
}

function checkConfiguration(): HealthCheck[] {
  const checks: HealthCheck[] = [];

  // .env
  const envPath = join(paths.apps.api, '.env');
  if (existsSync(envPath)) {
    checks.push({
      name: 'API .env',
      status: 'pass',
      message: 'Existe',
    });
  } else {
    checks.push({
      name: 'API .env',
      status: 'fail',
      message: 'No existe',
      fix: 'cp apps/api/config-example.env apps/api/.env',
    });
  }

  // tsconfig
  if (existsSync(join(paths.root, 'tsconfig.base.json'))) {
    checks.push({
      name: 'TypeScript config',
      status: 'pass',
      message: 'OK',
    });
  } else {
    checks.push({
      name: 'TypeScript config',
      status: 'fail',
      message: 'tsconfig.base.json no encontrado',
    });
  }

  return checks;
}

function checkGit(): HealthCheck[] {
  const checks: HealthCheck[] = [];

  const repoInfo = getRepoInfo();

  if (repoInfo.isRepo) {
    checks.push({
      name: 'Git repo',
      status: 'pass',
      message: `Branch: ${repoInfo.branch}`,
    });

    if (repoInfo.isDirty) {
      checks.push({
        name: 'Git status',
        status: 'warn',
        message: 'Hay cambios sin commitear',
      });
    } else {
      checks.push({
        name: 'Git status',
        status: 'pass',
        message: 'Limpio',
      });
    }
  } else {
    checks.push({
      name: 'Git repo',
      status: 'fail',
      message: 'No es un repositorio git',
    });
  }

  return checks;
}

async function checkServices(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // PostgreSQL
  const pgCheck = exec('docker ps --format "{{.Names}}" | grep -i postgres', {
    silent: true,
    stdio: 'pipe',
  });

  if (pgCheck.success && pgCheck.stdout) {
    checks.push({
      name: 'PostgreSQL',
      status: 'pass',
      message: 'Corriendo en Docker',
    });
  } else {
    checks.push({
      name: 'PostgreSQL',
      status: 'warn',
      message: 'No está corriendo',
      fix: 'docker compose up -d',
    });
  }

  return checks;
}

async function checkBuild(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  try {
    await withSpinner('Verificando typecheck', async () => {
      const result = await execAsync('pnpm typecheck', { cwd: paths.root });
      if (!result.success) {
        throw new Error('Typecheck failed');
      }
    });

    checks.push({
      name: 'TypeCheck',
      status: 'pass',
      message: 'Sin errores',
    });
  } catch {
    checks.push({
      name: 'TypeCheck',
      status: 'fail',
      message: 'Hay errores de tipos',
      fix: 'pnpm typecheck para ver detalles',
    });
  }

  try {
    await withSpinner('Verificando lint', async () => {
      const result = await execAsync('pnpm lint', { cwd: paths.root });
      if (!result.success) {
        throw new Error('Lint failed');
      }
    });

    checks.push({
      name: 'Lint',
      status: 'pass',
      message: 'Sin errores',
    });
  } catch {
    checks.push({
      name: 'Lint',
      status: 'warn',
      message: 'Hay warnings o errores de lint',
      fix: 'pnpm lint para ver detalles',
    });
  }

  return checks;
}

async function checkTests(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  try {
    await withSpinner('Ejecutando tests críticos', async () => {
      const result = await execAsync('pnpm test', { cwd: paths.root });
      if (!result.success) {
        throw new Error('Tests failed');
      }
    });

    checks.push({
      name: 'Tests',
      status: 'pass',
      message: 'Todos pasan',
    });
  } catch {
    checks.push({
      name: 'Tests',
      status: 'fail',
      message: 'Algunos tests fallan',
      fix: 'pnpm test para ver detalles',
    });
  }

  return checks;
}

function displayResults(checks: HealthCheck[]): void {
  logger.newline();

  const passed = checks.filter((c) => c.status === 'pass').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  const failed = checks.filter((c) => c.status === 'fail').length;

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    const color = check.status === 'pass' ? colors.success : check.status === 'warn' ? colors.warning : colors.error;
    console.log(`${icon} ${colors.bold(check.name)}: ${color(check.message)}`);
    if (check.fix && check.status !== 'pass') {
      console.log(`   ${colors.muted('Fix:')} ${check.fix}`);
    }
  }

  logger.newline();
  logger.separator();

  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.error;

  console.log(`\n${colors.bold('Resumen:')} ${passed} passed, ${warned} warnings, ${failed} failed`);
  console.log(`${colors.bold('Health Score:')} ${scoreColor(`${score}%`)}\n`);
}

async function attemptFixes(checks: HealthCheck[]): Promise<void> {
  const fixable = checks.filter((c) => c.status !== 'pass' && c.fix);

  if (fixable.length === 0) {
    logger.info('No hay correcciones automáticas disponibles');
    return;
  }

  logger.subheader('Intentando correcciones automáticas');

  for (const check of fixable) {
    if (!check.fix) continue;

    logger.info(`Corrigiendo: ${check.name}`);

    try {
      if (check.fix.startsWith('pnpm') || check.fix.startsWith('npm')) {
        await execAsync(check.fix, { cwd: paths.root });
        logger.success(`Corregido: ${check.name}`);
      } else if (check.fix.startsWith('cp ')) {
        const parts = check.fix.split(' ');
        if (parts.length === 3) {
          const { copyFileSync } = await import('fs');
          copyFileSync(join(paths.root, parts[1]), join(paths.root, parts[2]));
          logger.success(`Corregido: ${check.name}`);
        }
      } else {
        logger.warn(`Corrección manual requerida: ${check.fix}`);
      }
    } catch (error) {
      logger.error(`No se pudo corregir: ${check.name}`);
    }
  }
}

