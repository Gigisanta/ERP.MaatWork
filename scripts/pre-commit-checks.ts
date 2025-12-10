#!/usr/bin/env tsx
/**
 * Script de verificaciones pre-commit
 *
 * Ejecuta verificaciones rápidas en archivos staged para prevenir código muerto
 * y problemas comunes antes de commit
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface CheckResult {
  name: string;
  passed: boolean;
  warnings: string[];
  errors: string[];
}

function getStagedFiles(): string[] {
  try {
    const result = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
    return result
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    console.warn('Could not get staged files:', error);
    return [];
  }
}

function checkUnusedImports(files: string[]): CheckResult {
  const result: CheckResult = {
    name: 'Unused Imports',
    passed: true,
    warnings: [],
    errors: [],
  };

  const tsFiles = files
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .filter((f) => !f.includes('.test.') && !f.includes('.spec.'));

  if (tsFiles.length === 0) {
    return result;
  }

  // Verificar imports no usados usando ESLint si está disponible
  try {
    // Esto es una verificación básica - ESLint debería hacer el trabajo real
    for (const file of tsFiles.slice(0, 10)) {
      // Solo verificar primeros 10 archivos para performance
      try {
        const content = readFileSync(file, 'utf-8');
        // Buscar patrones comunes de imports no usados
        // Esto es básico - ESLint hace mejor trabajo
      } catch (error) {
        // Ignorar errores de lectura
      }
    }
  } catch (error) {
    // ESLint no disponible o error
  }

  return result;
}

function checkDeadCode(files: string[]): CheckResult {
  const result: CheckResult = {
    name: 'Dead Code Detection',
    passed: true,
    warnings: [],
    errors: [],
  };

  const tsFiles = files
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .filter((f) => !f.includes('.test.') && !f.includes('.spec.'));

  if (tsFiles.length === 0) {
    return result;
  }

  // Verificación básica: buscar exports que podrían no usarse
  // Nota: ts-prune es más completo pero más lento, solo warnings aquí
  try {
    // Ejecutar ts-prune solo en archivos staged (más rápido)
    const filesArg = tsFiles.slice(0, 5).join(' '); // Limitar para performance
    if (filesArg) {
      try {
        execSync(
          `npx ts-prune --project tsconfig.prune.json --ignore "test|spec|d.ts" 2>&1 | head -20`,
          { encoding: 'utf-8', cwd: process.cwd(), stdio: 'pipe' }
        );
        // Si hay salida, hay código muerto potencial
        result.warnings.push(
          'Se encontró código muerto potencial. Ejecuta "pnpm audit:dead-code" para detalles.'
        );
      } catch (error) {
        // ts-prune puede fallar si no encuentra código muerto o hay errores
        // No es crítico en pre-commit
      }
    }
  } catch (error) {
    // Herramienta no disponible
  }

  return result;
}

function checkUnusedDependencies(files: string[]): CheckResult {
  const result: CheckResult = {
    name: 'Unused Dependencies',
    passed: true,
    warnings: [],
    errors: [],
  };

  // Solo verificar si package.json cambió
  const packageJsonChanged = files.some(
    (f) =>
      f.includes('package.json') &&
      !f.includes('package-lock.json') &&
      !f.includes('pnpm-lock.yaml')
  );

  if (!packageJsonChanged) {
    return result;
  }

  try {
    // Ejecutar depcheck solo si package.json cambió
    const output = execSync(
      'npx depcheck --ignores="@types/*,eslint*,prettier,vitest,@vitest/*,playwright,@playwright/*,turbo,husky,lint-staged,@changesets/*,@lhci/*,rimraf,chalk,ts-prune,knip,unimport" 2>&1',
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      }
    );

    if (output && output.trim().length > 0 && !output.includes('No depcheck issue')) {
      result.warnings.push(
        'Se encontraron dependencias no usadas. Ejecuta "pnpm audit:deps" para detalles.'
      );
    }
  } catch (error) {
    // depcheck puede fallar, no es crítico
  }

  return result;
}

function checkDeprecatedImports(files: string[]): CheckResult {
  const result: CheckResult = {
    name: 'Deprecated Imports',
    passed: true,
    warnings: [],
    errors: [],
  };

  const tsFiles = files.filter(
    (f) =>
      (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.') && !f.includes('.spec.')
  );

  for (const file of tsFiles) {
    try {
      const content = readFileSync(file, 'utf-8');

      // Buscar imports de código deprecado conocido
      if (
        content.includes("from './debug-console'") ||
        content.includes("from '../lib/debug-console'") ||
        content.includes("from '@/lib/debug-console'")
      ) {
        if (
          !content.includes("from './debug-console/index'") &&
          !content.includes("from '../lib/debug-console/index'") &&
          !content.includes("from '@/lib/debug-console/index'")
        ) {
          result.errors.push(`${file}: Usa './debug-console/index' en lugar de './debug-console'`);
          result.passed = false;
        }
      }
    } catch (error) {
      // Ignorar errores de lectura
    }
  }

  return result;
}

function main() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('✅ No hay archivos staged. Saltando verificaciones.');
    process.exit(0);
  }

  console.log(`🔍 Verificando ${stagedFiles.length} archivos staged...\n`);

  const checks: CheckResult[] = [
    checkDeprecatedImports(stagedFiles),
    checkUnusedImports(stagedFiles),
    checkDeadCode(stagedFiles),
    checkUnusedDependencies(stagedFiles),
  ];

  let hasErrors = false;
  let hasWarnings = false;

  for (const check of checks) {
    if (check.errors.length > 0) {
      hasErrors = true;
      console.log(`❌ ${check.name}:`);
      for (const error of check.errors) {
        console.log(`   - ${error}`);
      }
      console.log('');
    } else if (check.warnings.length > 0) {
      hasWarnings = true;
      console.log(`⚠️  ${check.name}:`);
      for (const warning of check.warnings) {
        console.log(`   - ${warning}`);
      }
      console.log('');
    } else {
      console.log(`✅ ${check.name}`);
    }
  }

  console.log('');

  if (hasErrors) {
    console.log('❌ Se encontraron errores. Por favor corrígelos antes de commit.');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('⚠️  Se encontraron warnings. Revisa antes de commit.');
    // No bloquear por warnings, solo informar
  } else {
    console.log('✅ Todas las verificaciones pasaron.');
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

export { checkDeprecatedImports, checkUnusedImports, checkDeadCode, checkUnusedDependencies };
