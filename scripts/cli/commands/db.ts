/**
 * Comando: db
 *
 * Comandos de base de datos (migraciones, seeds, backup, etc.)
 */

import { Command } from 'commander';
import { logger, exec, execAsync, paths, withSpinner, confirm } from '../../lib/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export const dbCommand = new Command('db')
  .description('Comandos de base de datos')
  .addCommand(migrateCommand())
  .addCommand(seedCommand())
  .addCommand(studioCommand())
  .addCommand(resetCommand())
  .addCommand(generateCommand())
  .addCommand(backupCommand())
  .addCommand(restoreCommand());

function migrateCommand(): Command {
  return new Command('migrate')
    .description('Ejecutar migraciones pendientes')
    .option('--dry-run', 'Solo mostrar migraciones pendientes')
    .action(async (options) => {
      logger.header('Migraciones de Base de Datos');

      if (options.dryRun) {
        logger.info('Modo dry-run: mostrando migraciones pendientes...');
        exec('pnpm -F @maatwork/db drizzle-kit generate --dry-run', {
          cwd: paths.root,
          stdio: 'inherit',
        });
        return;
      }

      await withSpinner('Ejecutando migraciones', async () => {
        const result = await execAsync('pnpm -F @maatwork/db migrate', { cwd: paths.root });
        if (!result.success) {
          throw new Error(result.stderr || 'Error ejecutando migraciones');
        }
      });

      logger.success('Migraciones ejecutadas correctamente');
    });
}

function seedCommand(): Command {
  return new Command('seed')
    .description('Ejecutar seeds de datos')
    .option('--type <type>', 'Tipo de seed (all, pipeline, benchmarks, full)', 'all')
    .action(async (options) => {
      logger.header('Seeds de Base de Datos');

      const seedCommands: Record<string, string> = {
        all: 'pnpm -F @maatwork/db seed:all',
        pipeline: 'pnpm -F @maatwork/db seed:pipeline',
        benchmarks: 'pnpm -F @maatwork/db seed:benchmarks',
        full: 'pnpm -F @maatwork/db seed:full',
      };

      const cmd = seedCommands[options.type];
      if (!cmd) {
        logger.error(`Tipo de seed desconocido: ${options.type}`);
        logger.info('Tipos disponibles: all, pipeline, benchmarks, full');
        process.exit(1);
      }

      await withSpinner(`Ejecutando seed: ${options.type}`, async () => {
        const result = await execAsync(cmd, { cwd: paths.root });
        if (!result.success) {
          throw new Error(result.stderr || 'Error ejecutando seed');
        }
      });

      logger.success('Seeds ejecutados correctamente');
    });
}

function studioCommand(): Command {
  return new Command('studio')
    .description('Abrir Drizzle Studio para inspeccionar la BD')
    .action(() => {
      logger.info('Abriendo Drizzle Studio...');
      logger.info('Presiona Ctrl+C para cerrar');
      logger.newline();

      exec('pnpm -F @maatwork/db studio', {
        cwd: paths.root,
        stdio: 'inherit',
      });
    });
}

function resetCommand(): Command {
  return new Command('reset')
    .description('Resetear base de datos (DESTRUCTIVO)')
    .option('--force', 'No pedir confirmación')
    .option('--seed', 'Ejecutar seeds después del reset')
    .action(async (options) => {
      logger.header('Reset de Base de Datos');
      logger.warn('Esta operación eliminará TODOS los datos!');
      logger.newline();

      if (!options.force) {
        const confirmed = await confirm('¿Estás seguro de que deseas continuar?', false);
        if (!confirmed) {
          logger.info('Operación cancelada');
          return;
        }
      }

      await withSpinner('Reseteando base de datos', async () => {
        const result = await execAsync('pnpm -F @maatwork/db db:reset', { cwd: paths.root });
        if (!result.success) {
          throw new Error(result.stderr || 'Error reseteando BD');
        }
      });

      await withSpinner('Ejecutando migraciones', async () => {
        const result = await execAsync('pnpm -F @maatwork/db migrate', { cwd: paths.root });
        if (!result.success) {
          throw new Error(result.stderr || 'Error ejecutando migraciones');
        }
      });

      if (options.seed) {
        await withSpinner('Ejecutando seeds', async () => {
          const result = await execAsync('pnpm -F @maatwork/db seed:all', { cwd: paths.root });
          if (!result.success) {
            throw new Error(result.stderr || 'Error ejecutando seeds');
          }
        });
      }

      logger.success('Base de datos reseteada correctamente');
    });
}

function generateCommand(): Command {
  return new Command('generate')
    .description('Generar nueva migración desde cambios en schema')
    .option('--name <name>', 'Nombre de la migración')
    .action(async (options) => {
      logger.header('Generar Migración');

      const cmd = options.name
        ? `pnpm -F @maatwork/db generate --name ${options.name}`
        : 'pnpm -F @maatwork/db generate';

      await withSpinner('Generando migración', async () => {
        const result = await execAsync(cmd, { cwd: paths.root });
        if (!result.success) {
          throw new Error(result.stderr || 'Error generando migración');
        }
      });

      logger.success('Migración generada');
      logger.info('Revisa el archivo generado en packages/db/migrations/');
    });
}

function backupCommand(): Command {
  return new Command('backup')
    .description('Crear backup local de la base de datos')
    .option('--output <path>', 'Ruta de salida', '.backups')
    .action(async (options) => {
      logger.header('Backup de Base de Datos');

      const backupDir = join(paths.root, options.output);
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = join(backupDir, `backup-${timestamp}.sql`);

      await withSpinner('Creando backup', async () => {
        // Obtener DATABASE_URL del .env
        const envPath = join(paths.apps.api, '.env');
        if (!existsSync(envPath)) {
          throw new Error('Archivo .env no encontrado');
        }

        const envContent = readFileSync(envPath, 'utf-8');
        const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
        if (!dbUrlMatch) {
          throw new Error('DATABASE_URL no encontrada en .env');
        }

        const dbUrl = dbUrlMatch[1];
        const result = await execAsync(`docker exec -i $(docker ps -qf "name=postgres") pg_dump "${dbUrl}" > "${backupFile}"`, {
          cwd: paths.root,
        });

        if (!result.success) {
          throw new Error(result.stderr || 'Error creando backup');
        }
      });

      logger.success(`Backup creado: ${backupFile}`);
    });
}

function restoreCommand(): Command {
  return new Command('restore')
    .description('Restaurar base de datos desde backup')
    .argument('<file>', 'Archivo de backup a restaurar')
    .option('--force', 'No pedir confirmación')
    .action(async (file, options) => {
      logger.header('Restaurar Base de Datos');

      const backupPath = join(paths.root, file);
      if (!existsSync(backupPath)) {
        logger.error(`Archivo no encontrado: ${file}`);
        process.exit(1);
      }

      logger.warn('Esta operación sobrescribirá los datos actuales!');

      if (!options.force) {
        const confirmed = await confirm('¿Continuar con la restauración?', false);
        if (!confirmed) {
          logger.info('Operación cancelada');
          return;
        }
      }

      await withSpinner('Restaurando base de datos', async () => {
        const envPath = join(paths.apps.api, '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);

        if (!dbUrlMatch) {
          throw new Error('DATABASE_URL no encontrada en .env');
        }

        const dbUrl = dbUrlMatch[1];
        const result = await execAsync(`docker exec -i $(docker ps -qf "name=postgres") psql "${dbUrl}" < "${backupPath}"`, {
          cwd: paths.root,
        });

        if (!result.success) {
          throw new Error(result.stderr || 'Error restaurando backup');
        }
      });

      logger.success('Base de datos restaurada correctamente');
    });
}

