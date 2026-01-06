/**
 * Comando: release
 *
 * Gestión de releases y changelog.
 */

import { Command } from 'commander';
import {
  logger,
  exec,
  execAsync,
  paths,
  withSpinner,
  confirm,
  getCurrentBranch,
  hasUncommittedChanges,
  getLatestTag,
  createTag,
  push,
  colors,
} from '../../lib/index';

export const releaseCommand = new Command('release')
  .description('Gestión de releases')
  .addCommand(prepareCommand())
  .addCommand(changelogCommand())
  .addCommand(publishCommand())
  .addCommand(statusCommand());

function prepareCommand(): Command {
  return new Command('prepare')
    .description('Preparar release (verificar, changelog, etc.)')
    .option('--skip-verify', 'Omitir verificación completa')
    .action(async (options) => {
      logger.header('Preparar Release');

      // 1. Verificar rama
      const branch = getCurrentBranch();
      if (!branch || !['main', 'develop', 'master'].includes(branch)) {
        logger.error(`Rama actual: ${branch}`);
        logger.error('Los releases solo se pueden hacer desde main o develop');
        process.exit(1);
      }

      logger.success(`Rama: ${branch}`);

      // 2. Verificar cambios sin commitear
      if (hasUncommittedChanges()) {
        logger.error('Hay cambios sin commitear');
        logger.info('Commitea o stashea los cambios antes de continuar');
        process.exit(1);
      }

      logger.success('Working directory limpio');

      // 3. Verificar proyecto
      if (!options.skipVerify) {
        logger.newline();
        logger.info('Ejecutando verificación completa...');

        const verifyResult = exec('pnpm verify:all:no-e2e', {
          cwd: paths.root,
          stdio: 'inherit',
        });

        if (!verifyResult.success) {
          logger.error('La verificación falló. Corrige los errores antes de continuar.');
          process.exit(1);
        }
      }

      // 4. Generar changelog con changesets
      logger.newline();
      logger.info('Generando changelog...');

      const changesetResult = exec('pnpm changeset version', {
        cwd: paths.root,
        stdio: 'inherit',
      });

      if (!changesetResult.success) {
        logger.warn('No hay changesets pendientes o hubo un error');
      }

      // 5. Mostrar siguiente paso
      logger.newline();
      logger.success('Release preparado');
      logger.newline();
      logger.info('Siguientes pasos:');
      logger.list([
        'Revisa el CHANGELOG.md',
        'Commitea los cambios: git add . && git commit -m "chore: prepare release"',
        'Publica: pnpm mw release publish',
      ]);
    });
}

function changelogCommand(): Command {
  return new Command('changelog')
    .description('Generar o ver changelog')
    .option('--add', 'Agregar nuevo changeset')
    .action(async (options) => {
      if (options.add) {
        logger.header('Agregar Changeset');
        exec('pnpm changeset', { cwd: paths.root, stdio: 'inherit' });
      } else {
        logger.header('Changelog');

        // Mostrar changesets pendientes
        const pendingResult = exec('ls .changeset/*.md 2>/dev/null | grep -v README', {
          cwd: paths.root,
          silent: true,
        });

        if (pendingResult.success && pendingResult.stdout) {
          const files = pendingResult.stdout.split('\n').filter(Boolean);
          logger.info(`Changesets pendientes: ${files.length}`);
          logger.newline();

          for (const file of files) {
            console.log(`  📝 ${file}`);
          }
        } else {
          logger.info('No hay changesets pendientes');
        }

        logger.newline();

        // Mostrar último tag
        const lastTag = getLatestTag();
        if (lastTag) {
          logger.info(`Último release: ${lastTag}`);
        }
      }
    });
}

function publishCommand(): Command {
  return new Command('publish')
    .description('Publicar release (crear tag y push)')
    .option('--dry-run', 'Solo mostrar qué se haría')
    .action(async (options) => {
      logger.header('Publicar Release');

      // 1. Verificar rama
      const branch = getCurrentBranch();
      if (!branch || !['main', 'master'].includes(branch)) {
        logger.error('Los releases solo se publican desde main');
        process.exit(1);
      }

      // 2. Verificar cambios sin commitear
      if (hasUncommittedChanges()) {
        logger.error('Hay cambios sin commitear');
        process.exit(1);
      }

      // 3. Obtener versión del package.json
      const pkgResult = exec('node -p "require(\'./package.json\').version"', {
        cwd: paths.root,
        silent: true,
      });

      const version = pkgResult.stdout.trim();
      const tagName = `v${version}`;

      logger.info(`Versión: ${version}`);
      logger.info(`Tag: ${tagName}`);

      // Verificar si el tag ya existe
      const lastTag = getLatestTag();
      if (lastTag === tagName) {
        logger.warn(`El tag ${tagName} ya existe`);
        const proceed = await confirm('¿Continuar de todos modos?', false);
        if (!proceed) {
          return;
        }
      }

      if (options.dryRun) {
        logger.info('Dry-run: se habría creado el tag y push');
        return;
      }

      // 4. Crear tag
      await withSpinner(`Creando tag ${tagName}`, async () => {
        const success = createTag(tagName, `Release ${version}`);
        if (!success) {
          throw new Error('Error creando tag');
        }
      });

      // 5. Push
      const doPush = await confirm('¿Hacer push del tag?', true);
      if (doPush) {
        await withSpinner('Pushing to origin', async () => {
          await push('origin', branch);
          await execAsync(`git push origin ${tagName}`, { cwd: paths.root });
        });
      }

      logger.success(`Release ${version} publicado!`);
      logger.newline();
      logger.info('El CI/CD debería iniciar el deploy automáticamente');
    });
}

function statusCommand(): Command {
  return new Command('status').description('Ver estado del release').action(async () => {
    logger.header('Estado de Release');

    const branch = getCurrentBranch();
    const lastTag = getLatestTag();
    const isDirty = hasUncommittedChanges();

    // Obtener versión actual
    const pkgResult = exec('node -p "require(\'./package.json\').version"', {
      cwd: paths.root,
      silent: true,
    });
    const currentVersion = pkgResult.stdout.trim();

    // Contar changesets pendientes
    const changesetResult = exec('ls .changeset/*.md 2>/dev/null | grep -v README | wc -l', {
      cwd: paths.root,
      silent: true,
    });
    const pendingChangesets = parseInt(changesetResult.stdout.trim(), 10) || 0;

    // Contar commits desde último tag
    let commitsSinceTag = 0;
    if (lastTag) {
      const commitsResult = exec(`git rev-list ${lastTag}..HEAD --count`, {
        cwd: paths.root,
        silent: true,
      });
      commitsSinceTag = parseInt(commitsResult.stdout.trim(), 10) || 0;
    }

    logger.keyValue({
      'Rama actual': branch || 'N/A',
      'Versión actual': currentVersion,
      'Último tag': lastTag || 'Ninguno',
      'Commits desde tag': String(commitsSinceTag),
      'Changesets pendientes': String(pendingChangesets),
      'Working dir': isDirty ? colors.warning('Sucio') : colors.success('Limpio'),
    });

    logger.newline();

    if (pendingChangesets > 0) {
      logger.info('Hay changesets pendientes. Ejecuta:');
      logger.list(['pnpm mw release prepare']);
    } else if (commitsSinceTag > 0) {
      logger.info('Hay commits sin release. Considera crear un changeset:');
      logger.list(['pnpm mw release changelog --add']);
    } else {
      logger.success('Todo está actualizado');
    }
  });
}
