/**
 * Comando: clean
 *
 * Comandos de limpieza del proyecto.
 */

import { Command } from 'commander';
import {
  logger,
  exec,
  paths,
  withSpinner,
  confirm,
  remove,
  getDirSize,
  formatSize,
} from '../../lib/index';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

export const cleanCommand = new Command('clean')
  .description('Comandos de limpieza')
  .addCommand(cacheCommand())
  .addCommand(artifactsCommand())
  .addCommand(depsCommand())
  .addCommand(devCommand())
  .addCommand(allCommand());

function devCommand(): Command {
  return new Command('dev')
    .description('Limpieza rápida para desarrollo (caches + carpetas .next/dist)')
    .option('--quiet', 'No mostrar logs detallados')
    .action(async (options) => {
      if (!options.quiet) logger.header('Limpieza de Desarrollo');

      const toRemove = [
        '.turbo',
        'apps/web/.next',
        'apps/api/dist',
        'packages/ui/dist',
        'packages/db/dist',
        'packages/types/dist',
      ];

      await withSpinner(
        'Limpiando entorno dev',
        async () => {
          for (const item of toRemove) {
            const fullPath = join(paths.root, item);
            if (existsSync(fullPath)) {
              rmSync(fullPath, { recursive: true, force: true });
            }
          }
        },
        options.quiet
      );

      if (!options.quiet) logger.success('Limpieza dev completada');
    });
}

function cacheCommand(): Command {
  return new Command('cache')
    .description('Limpiar caches (turbo, next, typescript)')
    .action(async () => {
      logger.header('Limpieza de Caches');

      await withSpinner('Limpiando caches', async () => {
        // Turbo cache
        const turboPath = join(paths.root, '.turbo');
        if (existsSync(turboPath)) {
          rmSync(turboPath, { recursive: true, force: true });
        }

        // Next.js cache
        const nextPath = join(paths.apps.web, '.next');
        if (existsSync(nextPath)) {
          rmSync(nextPath, { recursive: true, force: true });
        }

        // TypeScript build info
        exec('find . -name "*.tsbuildinfo" -type f -delete', {
          cwd: paths.root,
          silent: true,
        });

        // Turbo daemon
        exec('pnpm turbo daemon stop', { cwd: paths.root, silent: true });
      });

      logger.success('Caches limpiados');
    });
}

function artifactsCommand(): Command {
  return new Command('artifacts')
    .description('Limpiar artefactos de build (dist, coverage)')
    .action(async () => {
      logger.header('Limpieza de Artefactos');

      const artifacts = [
        'apps/api/dist',
        'apps/web/.next',
        'packages/ui/dist',
        'packages/db/dist',
        'packages/types/dist',
        'apps/api/coverage',
        'apps/web/coverage',
        'packages/ui/coverage',
        'test-results',
      ];

      let totalSize = 0;

      for (const artifact of artifacts) {
        const fullPath = join(paths.root, artifact);
        if (existsSync(fullPath)) {
          const size = getDirSize(fullPath);
          totalSize += size;
        }
      }

      logger.info(`Espacio a liberar: ${formatSize(totalSize)}`);

      await withSpinner('Eliminando artefactos', async () => {
        for (const artifact of artifacts) {
          remove(artifact);
        }
      });

      logger.success('Artefactos eliminados');
      logger.info(`Espacio liberado: ${formatSize(totalSize)}`);
    });
}

function depsCommand(): Command {
  return new Command('deps')
    .description('Limpiar y reinstalar dependencias')
    .option('--force', 'No pedir confirmación')
    .action(async (options) => {
      logger.header('Limpieza de Dependencias');

      const nodeModulesDirs = [
        'node_modules',
        'apps/api/node_modules',
        'apps/web/node_modules',
        'apps/analytics-service/node_modules',
        'packages/ui/node_modules',
        'packages/db/node_modules',
        'packages/types/node_modules',
      ];

      let totalSize = 0;
      for (const dir of nodeModulesDirs) {
        const fullPath = join(paths.root, dir);
        if (existsSync(fullPath)) {
          totalSize += getDirSize(fullPath);
        }
      }

      logger.info(`Espacio en node_modules: ${formatSize(totalSize)}`);

      if (!options.force) {
        const confirmed = await confirm('¿Eliminar y reinstalar dependencias?', false);
        if (!confirmed) {
          logger.info('Operación cancelada');
          return;
        }
      }

      await withSpinner('Eliminando node_modules', async () => {
        for (const dir of nodeModulesDirs) {
          remove(dir);
        }
        // También eliminar lockfile store
        remove('pnpm-lock.yaml');
      });

      await withSpinner('Reinstalando dependencias', async () => {
        exec('pnpm install', { cwd: paths.root, stdio: 'inherit' });
      });

      logger.success('Dependencias reinstaladas');
    });
}

function allCommand(): Command {
  return new Command('all')
    .description('Limpieza completa (cache + artifacts + deps)')
    .option('--force', 'No pedir confirmación')
    .action(async (options) => {
      logger.header('Limpieza Completa');

      logger.warn('Esta operación eliminará:');
      logger.list([
        'Todos los caches (.turbo, .next, tsbuildinfo)',
        'Todos los artefactos (dist, coverage)',
        'Todas las dependencias (node_modules)',
      ]);

      if (!options.force) {
        const confirmed = await confirm('¿Continuar con la limpieza completa?', false);
        if (!confirmed) {
          logger.info('Operación cancelada');
          return;
        }
      }

      // Ejecutar cada limpieza
      logger.subheader('Paso 1: Caches');
      await exec('pnpm mw clean cache', { cwd: paths.root, stdio: 'inherit' });

      logger.subheader('Paso 2: Artefactos');
      await exec('pnpm mw clean artifacts', { cwd: paths.root, stdio: 'inherit' });

      logger.subheader('Paso 3: Dependencias');
      await exec('pnpm mw clean deps --force', { cwd: paths.root, stdio: 'inherit' });

      logger.success('Limpieza completa finalizada');
      logger.newline();
      logger.info('Para reconstruir el proyecto:');
      logger.list(['pnpm install', 'pnpm build']);
    });
}
