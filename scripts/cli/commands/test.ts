/**
 * Comando: test
 *
 * Comandos de testing (unit, e2e, coverage, etc.)
 */

import { Command } from 'commander';
import { logger, exec, execAsync, paths, withSpinner } from '../../lib/index';

export const testCommand = new Command('test')
  .description('Comandos de testing')
  .addCommand(unitCommand())
  .addCommand(e2eCommand())
  .addCommand(coverageCommand())
  .addCommand(watchCommand())
  .addCommand(affectedCommand());

function unitCommand(): Command {
  return new Command('unit')
    .description('Ejecutar tests unitarios')
    .option('--filter <packages>', 'Filtrar por paquetes (api,web,ui)', '')
    .option('--parallel', 'Ejecutar en paralelo', true)
    .action(async (options) => {
      logger.header('Tests Unitarios');

      let cmd = 'pnpm turbo run test:unit';

      if (options.filter) {
        const filters = options.filter.split(',').map((pkg: string) => {
          const name = pkg.trim().toLowerCase();
          return `--filter=@maatwork/${name}`;
        });
        cmd += ` ${filters.join(' ')}`;
      }

      if (options.parallel) {
        cmd += ' --concurrency=4';
      }

      const result = exec(cmd, { cwd: paths.root, stdio: 'inherit' });

      if (!result.success) {
        logger.error('Algunos tests fallaron');
        process.exit(1);
      }

      logger.success('Todos los tests pasaron');
    });
}

function e2eCommand(): Command {
  return new Command('e2e')
    .description('Ejecutar tests end-to-end')
    .option('--headed', 'Ejecutar en modo visible')
    .option('--ui', 'Abrir interfaz de Playwright')
    .option('--debug', 'Modo debug')
    .option('--setup', 'Preparar BD de test antes')
    .action(async (options) => {
      logger.header('Tests E2E');

      if (options.setup) {
        await withSpinner('Preparando base de datos de test', async () => {
          const result = await execAsync('pnpm tsx scripts/setup-e2e-db-optimized.ts', {
            cwd: paths.root,
          });
          if (!result.success) {
            throw new Error('Error preparando BD de test');
          }
        });
      }

      let cmd = 'playwright test';

      if (options.headed) {
        cmd += ' --headed';
      }

      if (options.ui) {
        cmd += ' --ui';
      }

      if (options.debug) {
        cmd += ' --debug';
      }

      logger.info('Ejecutando tests E2E...');
      logger.newline();

      const result = exec(cmd, { cwd: paths.root, stdio: 'inherit' });

      if (!result.success) {
        logger.error('Algunos tests E2E fallaron');
        process.exit(1);
      }

      logger.success('Tests E2E completados');
    });
}

function coverageCommand(): Command {
  return new Command('coverage')
    .description('Ejecutar tests con cobertura')
    .option('--check', 'Verificar thresholds de cobertura')
    .action(async (options) => {
      logger.header('Tests con Cobertura');

      await withSpinner('Ejecutando tests con cobertura', async () => {
        const result = await execAsync('pnpm turbo run test:coverage', { cwd: paths.root });
        if (!result.success) {
          throw new Error('Error ejecutando tests');
        }
      });

      if (options.check) {
        logger.info('Verificando thresholds de cobertura...');
        const checkResult = exec('pnpm test:coverage:check', { cwd: paths.root, silent: true });
        if (!checkResult.success) {
          logger.warn('Cobertura por debajo del threshold');
        } else {
          logger.success('Cobertura cumple con thresholds');
        }
      }

      logger.success('Cobertura generada');
      logger.info('Reportes disponibles en:');
      logger.list(['apps/api/coverage/', 'apps/web/coverage/', 'packages/ui/coverage/']);
    });
}

function watchCommand(): Command {
  return new Command('watch')
    .description('Ejecutar tests en modo watch')
    .option('--filter <package>', 'Paquete específico')
    .action((options) => {
      logger.info('Iniciando tests en modo watch...');
      logger.info('Presiona q para salir');
      logger.newline();

      let cmd = 'pnpm turbo run test:watch --parallel';

      if (options.filter) {
        cmd += ` --filter=@maatwork/${options.filter}`;
      }

      exec(cmd, { cwd: paths.root, stdio: 'inherit' });
    });
}

function affectedCommand(): Command {
  return new Command('affected')
    .description('Ejecutar tests solo en paquetes afectados')
    .option('--since <ref>', 'Referencia git para comparar', 'HEAD~1')
    .action(async (options) => {
      logger.header('Tests Afectados');

      logger.info(`Comparando con: ${options.since}`);

      const cmd = `pnpm turbo run test:unit --filter=[${options.since}]`;

      const result = exec(cmd, { cwd: paths.root, stdio: 'inherit' });

      if (!result.success) {
        logger.error('Algunos tests fallaron');
        process.exit(1);
      }

      logger.success('Tests afectados completados');
    });
}
