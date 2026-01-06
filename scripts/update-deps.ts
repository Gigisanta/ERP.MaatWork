#!/usr/bin/env tsx
/**
 * Update Deps - Actualización segura de dependencias
 *
 * Actualiza dependencias patch y minor automáticamente.
 * Para major updates, muestra qué se actualizaría pero no lo hace automáticamente.
 *
 * @example
 * pnpm tsx scripts/update-deps.ts           # Solo patch/minor
 * pnpm tsx scripts/update-deps.ts --major   # Incluye major
 * pnpm tsx scripts/update-deps.ts --dry-run # Solo mostrar
 */

import { logger, exec, execAsync, paths } from './lib/index';

interface PackageUpdate {
  pkg: string;
  current: string;
  latest: string;
  workspace?: string;
}

interface CategorizedUpdates {
  patch: PackageUpdate[];
  minor: PackageUpdate[];
  major: PackageUpdate[];
}

/**
 * Obtener paquetes desactualizados
 */
async function getOutdatedPackages(): Promise<
  Record<string, { current: string; latest: string; workspace?: string }>
> {
  try {
    const result = await execAsync('pnpm outdated --json', { cwd: paths.root, silent: true });

    if (!result.stdout || !result.stdout.trim()) {
      return {};
    }

    try {
      return JSON.parse(result.stdout.trim());
    } catch {
      // Intentar parsear línea por línea (ndjson)
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const packages: Record<string, { current: string; latest: string; workspace?: string }> = {};

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && typeof parsed === 'object') {
            Object.assign(packages, parsed);
          }
        } catch {
          // Ignorar líneas que no son JSON válido
        }
      }

      return packages;
    }
  } catch (error) {
    // pnpm outdated sale con código 1 si hay paquetes desactualizados
    const execError = error as { stdout?: string };
    if (execError.stdout) {
      try {
        return JSON.parse(execError.stdout.toString().trim());
      } catch {
        // Ignorar
      }
    }
    return {};
  }
}

/**
 * Categorizar actualizaciones por tipo
 */
function categorizeUpdates(
  outdated: Record<string, { current: string; latest: string; workspace?: string }>
): CategorizedUpdates {
  const patch: PackageUpdate[] = [];
  const minor: PackageUpdate[] = [];
  const major: PackageUpdate[] = [];

  for (const [pkg, info] of Object.entries(outdated)) {
    if (!info || typeof info !== 'object' || !info.current || !info.latest) {
      continue;
    }

    const current = info.current.split('.');
    const latest = info.latest.split('.');

    const update: PackageUpdate = {
      pkg,
      current: info.current,
      latest: info.latest,
      workspace: info.workspace,
    };

    if (current[0] !== latest[0]) {
      major.push(update);
    } else if (current[1] !== latest[1]) {
      minor.push(update);
    } else {
      patch.push(update);
    }
  }

  return { patch, minor, major };
}

/**
 * Mostrar actualizaciones
 */
function displayUpdates(updates: CategorizedUpdates): void {
  const { patch, minor, major } = updates;

  logger.subheader('Actualizaciones disponibles');

  if (patch.length > 0) {
    logger.info(`Patch updates (${patch.length}):`);
    for (const { pkg, current, latest, workspace } of patch) {
      const ws = workspace ? ` [${workspace}]` : '';
      console.log(`    🔵 ${pkg}: ${current} → ${latest}${ws}`);
    }
    logger.newline();
  }

  if (minor.length > 0) {
    logger.info(`Minor updates (${minor.length}):`);
    for (const { pkg, current, latest, workspace } of minor) {
      const ws = workspace ? ` [${workspace}]` : '';
      console.log(`    🟡 ${pkg}: ${current} → ${latest}${ws}`);
    }
    logger.newline();
  }

  if (major.length > 0) {
    logger.info(`Major updates (${major.length}):`);
    for (const { pkg, current, latest, workspace } of major) {
      const ws = workspace ? ` [${workspace}]` : '';
      console.log(`    🔴 ${pkg}: ${current} → ${latest}${ws}`);
    }
    logger.newline();
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const updateMajor = args.includes('--major');
  const dryRun = args.includes('--dry-run');

  logger.header('MAATWORK - Actualización de Dependencias');

  logger.info('Verificando dependencias desactualizadas...');
  logger.newline();

  const outdated = await getOutdatedPackages();
  const { patch, minor, major } = categorizeUpdates(outdated);

  if (patch.length === 0 && minor.length === 0 && major.length === 0) {
    logger.success('Todas las dependencias están actualizadas!');
    return;
  }

  displayUpdates({ patch, minor, major });

  if (dryRun) {
    logger.info('Dry-run mode: No se realizarán cambios');
    return;
  }

  // Preparar lista de paquetes a actualizar
  const toUpdate = [...patch, ...minor];
  if (updateMajor) {
    toUpdate.push(...major);
  }

  if (toUpdate.length === 0) {
    logger.warn('No hay actualizaciones para aplicar');
    logger.info('Usa --major para incluir major updates');
    return;
  }

  logger.info(`Actualizando ${toUpdate.length} paquetes...`);
  logger.newline();

  const packagesToUpdate = toUpdate.map(({ pkg }) => pkg).join(' ');
  const updateCommand = updateMajor
    ? `pnpm update ${packagesToUpdate} --latest`
    : `pnpm update ${packagesToUpdate}`;

  logger.debug(`Ejecutando: ${updateCommand}`);

  const result = exec(updateCommand, { cwd: paths.root, stdio: 'inherit' });

  if (result.success) {
    logger.newline();
    logger.success('Dependencias actualizadas exitosamente!');
    logger.newline();
    logger.info('Siguientes pasos:');
    logger.list([
      'Ejecutar tests: pnpm test',
      'Verificar tipos: pnpm typecheck',
      'Si todo está bien, commitear los cambios',
    ]);
  } else {
    logger.error('Error al actualizar dependencias');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Error fatal', error);
  process.exit(1);
});
