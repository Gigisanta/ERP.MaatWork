/**
 * Comando: dev
 *
 * Inicia el entorno de desarrollo con validaciones y servicios.
 */

import { Command } from 'commander';
import {
  logger,
  exec,
  execAsync,
  paths,
  config,
  pathExists,
  sleep,
  withSpinner,
} from '../../lib/index';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const devCommand = new Command('dev')
  .description('Iniciar entorno de desarrollo')
  .option('--fast', 'Omitir validaciones (más rápido)')
  .option('--skip-docker', 'No verificar/iniciar Docker')
  .option('--only <apps>', 'Solo iniciar apps específicas (api,web,analytics)', '')
  .option('--no-cache', 'Ignorar cache de validaciones')
  .action(async (options) => {
    logger.header('MAATWORK - Desarrollo');

    const startTime = Date.now();

    // 1. Verificar y construir paquetes si es necesario
    if (!options.fast) {
      await ensurePackagesBuilt();
    }

    // 2. Verificar Docker
    if (!options.skipDocker && !options.fast) {
      await ensureDockerServices();
    }

    // 3. Verificar .env
    ensureEnvFile();

    // 4. Iniciar desarrollo
    logger.info('Iniciando servicios de desarrollo...');
    logger.newline();

    const turboCmd = buildTurboCommand(options.only);

    try {
      exec(turboCmd, { cwd: paths.root, stdio: 'inherit' });
    } catch (error) {
      const execError = error as { signal?: string };
      // Ignorar SIGINT/SIGTERM (Ctrl+C)
      if (execError.signal !== 'SIGINT' && execError.signal !== 'SIGTERM') {
        logger.error('Error al iniciar desarrollo', error);
        process.exit(1);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`Sesión de desarrollo terminada (${duration}s)`);
  });

/**
 * Asegurar que los paquetes compartidos estén construidos
 */
async function ensurePackagesBuilt(): Promise<void> {
  const packagesToCheck = [
    { name: '@maatwork/ui', path: join(paths.packages.ui, 'dist') },
    { name: '@maatwork/db', path: join(paths.packages.db, 'dist') },
    { name: '@maatwork/types', path: join(paths.packages.types, 'dist') },
  ];

  const missingBuilds = packagesToCheck.filter((pkg) => !existsSync(pkg.path));

  if (missingBuilds.length > 0) {
    await withSpinner('Construyendo paquetes compartidos', async () => {
      const filters = missingBuilds.map((pkg) => `--filter=${pkg.name}`).join(' ');
      await execAsync(`pnpm turbo run build ${filters}`, { cwd: paths.root });
    });
  }
}

/**
 * Asegurar que Docker esté corriendo
 */
async function ensureDockerServices(): Promise<void> {
  // Verificar si Docker está disponible
  const dockerVersion = exec('docker --version', { silent: true, stdio: 'pipe' });
  if (!dockerVersion.success) {
    logger.warn('Docker no disponible - algunas funciones pueden no funcionar');
    return;
  }

  // Verificar si PostgreSQL está corriendo
  const postgresCheck = exec('docker ps --format "{{.Names}}" | grep -i postgres', {
    silent: true,
    stdio: 'pipe',
  });

  if (!postgresCheck.success || !postgresCheck.stdout) {
    logger.info('Iniciando servicios Docker...');

    try {
      exec('docker compose up -d', { cwd: paths.root, stdio: 'inherit' });
      await sleep(3000); // Esperar a que los servicios inicien
      logger.success('Servicios Docker iniciados');
    } catch (error) {
      logger.warn('No se pudieron iniciar servicios Docker');
      logger.info('Ejecuta manualmente: docker compose up -d');
    }
  } else {
    logger.success('Docker: PostgreSQL corriendo');
  }
}

/**
 * Asegurar que existe el archivo .env
 */
function ensureEnvFile(): void {
  const envPath = join(paths.apps.api, '.env');
  const envExamplePath = join(paths.apps.api, 'config-example.env');

  if (!pathExists(envPath) && pathExists(envExamplePath)) {
    logger.info('Creando archivo .env desde ejemplo...');
    try {
      copyFileSync(envExamplePath, envPath);
      logger.success('Archivo .env creado');
    } catch {
      logger.warn('No se pudo crear .env automáticamente');
    }
  }
}

/**
 * Construir comando de Turbo basado en opciones
 */
function buildTurboCommand(only: string): string {
  let cmd = 'pnpm turbo run dev --parallel';

  if (only) {
    const apps = only.split(',').map((app) => {
      const appName = app.trim().toLowerCase();
      switch (appName) {
        case 'api':
          return '--filter=@maatwork/api';
        case 'web':
          return '--filter=@maatwork/web';
        case 'analytics':
          return '--filter=@maatwork/analytics-service';
        default:
          return `--filter=@maatwork/${appName}`;
      }
    });
    cmd += ` ${apps.join(' ')}`;
  }

  return cmd;
}
