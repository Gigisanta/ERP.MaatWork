#!/usr/bin/env node

/**
 * Script para actualizar dependencias de forma segura
 *
 * Actualiza dependencias patch y minor automáticamente
 * Para major updates, muestra qué se actualizaría pero no lo hace automáticamente
 */

const { execSync } = require('child_process');
const { join } = require('path');

const rootDir = join(__dirname, '..');

function runCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      encoding: 'utf-8',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getOutdatedPackages() {
  try {
    const output = execSync('pnpm outdated --json', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!output || !output.trim()) return {};

    try {
      // Intentar parsear todo el output como un solo JSON
      return JSON.parse(output.trim());
    } catch (e) {
      // Si falla, intentar el método de línea por línea (por si acaso pnpm devuelve ndjson)
      const lines = output
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const packages = {};
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && typeof parsed === 'object') {
            Object.assign(packages, parsed);
          }
        } catch (innerE) {
          // Ignorar líneas que no son JSON válido
        }
      }
      return packages;
    }
  } catch (error) {
    // Si no hay paquetes desactualizados, pnpm outdated sale con código 1
    // También puede fallar si hay problemas de red, etc.
    try {
      // A veces el error.stdout contiene el JSON parcial o el error real es solo que hay paquetes outdated (exit 1)
      if (error.stdout) {
        return JSON.parse(error.stdout.toString().trim());
      }
    } catch (e) {}
    return {};
  }
}

function categorizeUpdates(outdated) {
  const patch = [];
  const minor = [];
  const major = [];

  for (const [pkg, info] of Object.entries(outdated)) {
    if (!info || typeof info !== 'object' || !info.current || !info.latest) {
      continue;
    }

    const current = info.current.split('.');
    const latest = info.latest.split('.');

    if (current[0] !== latest[0]) {
      major.push({ pkg, current: info.current, latest: info.latest, workspace: info.workspace });
    } else if (current[1] !== latest[1]) {
      minor.push({ pkg, current: info.current, latest: info.latest, workspace: info.workspace });
    } else {
      patch.push({ pkg, current: info.current, latest: info.latest, workspace: info.workspace });
    }
  }

  return { patch, minor, major };
}

function main() {
  const args = process.argv.slice(2);
  const updateMajor = args.includes('--major');
  const dryRun = args.includes('--dry-run');

  console.log('🔍 Verificando dependencias desactualizadas...\n');

  const outdated = getOutdatedPackages();
  const { patch, minor, major } = categorizeUpdates(outdated);

  if (patch.length === 0 && minor.length === 0 && major.length === 0) {
    console.log('✅ Todas las dependencias están actualizadas!\n');
    return;
  }

  console.log(`📦 Actualizaciones disponibles:\n`);
  if (patch.length > 0) {
    console.log(`  🔵 Patch updates (${patch.length}):`);
    patch.forEach(({ pkg, current, latest, workspace }) => {
      const workspaceStr = workspace ? ` [${workspace}]` : '';
      console.log(`    - ${pkg}: ${current} → ${latest}${workspaceStr}`);
    });
    console.log('');
  }

  if (minor.length > 0) {
    console.log(`  🟡 Minor updates (${minor.length}):`);
    minor.forEach(({ pkg, current, latest, workspace }) => {
      const workspaceStr = workspace ? ` [${workspace}]` : '';
      console.log(`    - ${pkg}: ${current} → ${latest}${workspaceStr}`);
    });
    console.log('');
  }

  if (major.length > 0) {
    console.log(`  🔴 Major updates (${major.length}):`);
    major.forEach(({ pkg, current, latest, workspace }) => {
      const workspaceStr = workspace ? ` [${workspace}]` : '';
      console.log(`    - ${pkg}: ${current} → ${latest}${workspaceStr}`);
    });
    console.log('');
  }

  if (dryRun) {
    console.log('🔍 Dry-run mode: No se realizarán cambios\n');
    return;
  }

  // Actualizar patch y minor
  const toUpdate = [...patch, ...minor];
  if (updateMajor) {
    toUpdate.push(...major);
  }

  if (toUpdate.length === 0) {
    console.log(
      '⚠️  No hay actualizaciones para aplicar (usa --major para incluir major updates)\n'
    );
    return;
  }

  console.log(`\n🚀 Actualizando ${toUpdate.length} paquetes...\n`);

  // Construir lista de paquetes a actualizar
  const packagesToUpdate = toUpdate.map(({ pkg }) => pkg).join(' ');

  // Actualizar usando pnpm update
  const updateCommand = updateMajor
    ? `pnpm update ${packagesToUpdate} --latest`
    : `pnpm update ${packagesToUpdate}`;

  console.log(`Ejecutando: ${updateCommand}\n`);

  const result = runCommand(updateCommand);

  if (result.success) {
    console.log('\n✅ Dependencias actualizadas exitosamente!\n');
    console.log('📝 Siguientes pasos:');
    console.log('   1. Ejecutar tests: pnpm test');
    console.log('   2. Verificar typecheck: pnpm typecheck');
    console.log('   3. Si todo está bien, commitear los cambios\n');
  } else {
    console.error('\n❌ Error al actualizar dependencias');
    console.error(result.error);
    process.exit(1);
  }
}

main();
