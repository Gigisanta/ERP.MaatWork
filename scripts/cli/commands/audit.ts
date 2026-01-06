/**
 * Comando: audit
 *
 * Auditorías de código, dependencias y seguridad.
 */

import { Command } from 'commander';
import { logger, exec, execAsync, paths, withSpinner, colors } from '../../lib/index';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

export const auditCommand = new Command('audit')
  .description('Auditorías de código')
  .addCommand(codeCommand())
  .addCommand(depsCommand())
  .addCommand(bundleCommand())
  .addCommand(consoleLogsCommand());

function codeCommand(): Command {
  return new Command('code')
    .description('Auditoría de código con Knip')
    .option('--fix', 'Intentar corregir automáticamente')
    .option('--ci', 'Modo CI (exit code 1 si hay problemas)')
    .action(async (options) => {
      logger.header('Auditoría de Código');

      const results = {
        knip: { success: false, issues: 0 },
        anyTypes: { count: 0 },
        barrels: { count: 0 },
      };

      // 1. Knip
      logger.info('Verificando código muerto y dependencias...');
      try {
        if (options.fix) {
          exec('npx knip --fix', { cwd: paths.root, stdio: 'inherit' });
        } else {
          exec('npx knip', { cwd: paths.root, stdio: 'inherit' });
        }
        results.knip.success = true;
      } catch {
        results.knip.success = false;
      }

      // 2. Auditar tipos any
      logger.newline();
      logger.info('Buscando usos de "any"...');
      results.anyTypes.count = countPattern([/:\s*any\b/g, /\bas\s+any\b/g]);
      console.log(`   Encontrados: ${results.anyTypes.count} usos de 'any'`);

      // 3. Auditar barrel exports
      logger.newline();
      logger.info('Buscando barrel exports...');
      results.barrels.count = countPattern([/export\s+\*\s+from/g]);
      console.log(`   Encontrados: ${results.barrels.count} barrel exports`);

      // Calcular score
      const knipScore = results.knip.success ? 50 : 10;
      const anyScore = Math.max(0, 25 - results.anyTypes.count * 0.1);
      const barrelScore = Math.max(0, 25 - results.barrels.count * 1);
      const totalScore = Math.round(knipScore + anyScore + barrelScore);

      // Mostrar resumen
      logger.newline();
      logger.subheader('Resumen de Auditoría');

      console.log(
        `  Código muerto: ${results.knip.success ? colors.success('LIMPIO') : colors.error('PROBLEMAS')}`
      );
      console.log(
        `  Tipos 'any': ${results.anyTypes.count > 0 ? colors.warning(String(results.anyTypes.count)) : colors.success('0')}`
      );
      console.log(
        `  Barrel exports: ${results.barrels.count > 0 ? colors.warning(String(results.barrels.count)) : colors.success('0')}`
      );

      const scoreColor =
        totalScore >= 80 ? colors.success : totalScore >= 60 ? colors.warning : colors.error;
      console.log(`\n  ${colors.bold('Cleanliness Score:')} ${scoreColor(`${totalScore}/100`)}`);

      if (!results.knip.success && options.fix) {
        logger.newline();
        logger.info('Ejecuta "pnpm knip --fix" para corregir automáticamente');
      }

      if (options.ci && !results.knip.success) {
        process.exit(1);
      }
    });
}

function depsCommand(): Command {
  return new Command('deps').description('Auditoría de dependencias').action(async () => {
    logger.header('Auditoría de Dependencias');

    // Outdated
    logger.info('Verificando dependencias desactualizadas...');
    exec('pnpm outdated', { cwd: paths.root, stdio: 'inherit' });

    logger.newline();

    // Audit de seguridad
    logger.info('Verificando vulnerabilidades...');
    const auditResult = exec('pnpm audit', { cwd: paths.root, silent: true });

    if (auditResult.success) {
      logger.success('No se encontraron vulnerabilidades');
    } else {
      logger.warn('Se encontraron algunas vulnerabilidades');
      console.log(auditResult.stdout);
    }
  });
}

function bundleCommand(): Command {
  return new Command('bundle')
    .description('Analizar tamaño de bundle')
    .option('--max-increase <percent>', 'Máximo aumento permitido (%)', '5')
    .action(async (options) => {
      logger.header('Análisis de Bundle');

      logger.info('Construyendo con análisis...');

      await withSpinner('Analizando bundle', async () => {
        await execAsync('pnpm -F @maatwork/web analyze', { cwd: paths.root });
      });

      logger.success('Análisis completado');
      logger.info('Abre el reporte en tu navegador para ver detalles');
    });
}

function consoleLogsCommand(): Command {
  return new Command('console-logs')
    .description('Buscar console.log en código de producción')
    .option('--fix', 'Mostrar archivos para corregir')
    .action(async (options) => {
      logger.header('Auditoría de Console.log');

      const consoleLogs = findConsoleLogs();

      if (consoleLogs.length === 0) {
        logger.success('No se encontraron console.log en código de producción');
        return;
      }

      logger.warn(`Encontrados ${consoleLogs.length} archivos con console.log:`);
      logger.newline();

      for (const { file, count } of consoleLogs) {
        console.log(`  ${colors.warning('⚠')} ${file} (${count} ocurrencias)`);
      }

      if (options.fix) {
        logger.newline();
        logger.info('Para corregir, reemplaza console.log con el logger estructurado:');
        logger.info('Backend: import { logger } from "@/utils/logger"');
        logger.info('Frontend: import { logger } from "@/lib/logger"');
      }

      process.exit(1);
    });
}

// ============================================
// Helper Functions
// ============================================

function countPattern(patterns: RegExp[]): number {
  let count = 0;
  const dirs = ['apps', 'packages'];
  const extensions = ['.ts', '.tsx'];

  for (const dir of dirs) {
    const fullPath = join(paths.root, dir);
    walkDir(fullPath, (filePath) => {
      const ext = extname(filePath);
      if (
        extensions.includes(ext) &&
        !filePath.includes('node_modules') &&
        !filePath.includes('dist') &&
        !filePath.includes('.next') &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.') &&
        !filePath.includes('__tests__')
      ) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              count += matches.length;
            }
          }
        } catch {
          // Ignorar errores de lectura
        }
      }
    });
  }

  return count;
}

function findConsoleLogs(): Array<{ file: string; count: number }> {
  const results: Array<{ file: string; count: number }> = [];
  const dirs = ['apps', 'packages'];
  const extensions = ['.ts', '.tsx'];
  const pattern = /console\.(log|info|warn|debug)\(/g;

  // Archivos/dirs a ignorar
  const ignorePatterns = [
    'node_modules',
    'dist',
    '.next',
    '.test.',
    '.spec.',
    '__tests__',
    'scripts/',
    'add-user.ts',
    'add-advisors.ts',
  ];

  for (const dir of dirs) {
    const fullPath = join(paths.root, dir);
    walkDir(fullPath, (filePath) => {
      const ext = extname(filePath);
      const shouldIgnore = ignorePatterns.some((p) => filePath.includes(p));

      if (extensions.includes(ext) && !shouldIgnore) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            const relativePath = filePath.replace(paths.root + '/', '');
            results.push({ file: relativePath, count: matches.length });
          }
        } catch {
          // Ignorar errores
        }
      }
    });
  }

  return results;
}

function walkDir(dir: string, callback: (filePath: string) => void): void {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath, callback);
        } else {
          callback(filePath);
        }
      } catch {
        // Ignorar errores de stat
      }
    }
  } catch {
    // Ignorar errores de lectura de directorio
  }
}
