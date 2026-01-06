#!/usr/bin/env tsx
/**
 * Guard Artifacts - Detecta artefactos trackeados en git
 *
 * Verifica que no se hayan agregado accidentalmente artefactos de build
 * al repositorio (node_modules, dist, .next, etc.)
 *
 * @example
 * pnpm tsx scripts/guard-artifacts.ts
 */

import { logger, exec } from './lib/index';

// Patrones prohibidos
const FORBIDDEN_PATTERNS = [
  /\/node_modules\//,
  /\/dist\//,
  /\/build\//,
  /\.next\//,
  /\.turbo\//,
  /\/coverage\//,
  /\.tsbuildinfo$/,
  /\.cache\//,
];

function main(): void {
  try {
    // Obtener lista de archivos trackeados por git
    const result = exec('git ls-files', { silent: true, stdio: 'pipe' });

    if (!result.success) {
      logger.error('Error al obtener archivos de git');
      process.exit(1);
    }

    const files = result.stdout.split('\n').filter(Boolean);
    const forbiddenFiles: string[] = [];

    for (const file of files) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(file)) {
          forbiddenFiles.push(file);
          break;
        }
      }
    }

    if (forbiddenFiles.length > 0) {
      logger.error('Artefactos detectados en git:');
      logger.newline();

      for (const file of forbiddenFiles) {
        console.log(`  ❌ ${file}`);
      }

      logger.newline();
      logger.warn('Por favor elimina estos archivos del tracking con:');
      logger.info('git rm --cached <archivo>');
      logger.newline();

      process.exit(1);
    }

    logger.success('No se encontraron artefactos en git');
    process.exit(0);
  } catch (error) {
    logger.error('Error verificando artefactos', error);
    process.exit(1);
  }
}

main();
