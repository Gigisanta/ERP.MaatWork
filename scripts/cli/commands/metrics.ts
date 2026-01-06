/**
 * Comando: metrics
 *
 * Dashboard de métricas del proyecto.
 */

import { Command } from 'commander';
import { logger, exec, paths, colors, getDirSize, formatSize } from '../../lib/index';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

export const metricsCommand = new Command('metrics')
  .description('Mostrar métricas del proyecto')
  .option('--json', 'Output en formato JSON')
  .action(async (options) => {
    if (!options.json) {
      logger.header('MAATWORK - Métricas del Proyecto');
    }

    const metrics = {
      codebase: getCodebaseMetrics(),
      packages: getPackageMetrics(),
      dependencies: getDependencyMetrics(),
      technicalDebt: getTechnicalDebtMetrics(),
    };

    if (options.json) {
      console.log(JSON.stringify(metrics, null, 2));
    } else {
      displayMetrics(metrics);
    }
  });

interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  byExtension: Record<string, { files: number; lines: number }>;
}

interface PackageMetrics {
  name: string;
  files: number;
  lines: number;
  size: string;
  hasTests: boolean;
  coverage?: string;
}

interface DependencyMetrics {
  total: number;
  production: number;
  development: number;
  outdated: number;
}

interface TechnicalDebtMetrics {
  anyTypes: number;
  todos: number;
  fixmes: number;
  barrelExports: number;
}

function getCodebaseMetrics(): CodebaseMetrics {
  const metrics: CodebaseMetrics = {
    totalFiles: 0,
    totalLines: 0,
    byExtension: {},
  };

  const dirs = ['apps', 'packages'];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.sql'];

  for (const dir of dirs) {
    const fullPath = join(paths.root, dir);
    walkDir(fullPath, (filePath) => {
      const ext = extname(filePath);
      if (
        extensions.includes(ext) &&
        !filePath.includes('node_modules') &&
        !filePath.includes('dist') &&
        !filePath.includes('.next') &&
        !filePath.includes('coverage')
      ) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').length;

          metrics.totalFiles++;
          metrics.totalLines += lines;

          if (!metrics.byExtension[ext]) {
            metrics.byExtension[ext] = { files: 0, lines: 0 };
          }
          metrics.byExtension[ext].files++;
          metrics.byExtension[ext].lines += lines;
        } catch {
          // Ignorar errores
        }
      }
    });
  }

  return metrics;
}

function getPackageMetrics(): PackageMetrics[] {
  const packages = [
    { name: '@maatwork/api', path: paths.apps.api },
    { name: '@maatwork/web', path: paths.apps.web },
    { name: '@maatwork/ui', path: paths.packages.ui },
    { name: '@maatwork/db', path: paths.packages.db },
    { name: '@maatwork/types', path: paths.packages.types },
  ];

  return packages.map((pkg) => {
    let files = 0;
    let lines = 0;
    let hasTests = false;

    const srcPath = join(pkg.path, 'src');
    const appPath = join(pkg.path, 'app');
    const libPath = join(pkg.path, 'lib');

    [srcPath, appPath, libPath].forEach((dirPath) => {
      try {
        walkDir(dirPath, (filePath) => {
          if (
            (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
            !filePath.includes('node_modules')
          ) {
            try {
              const content = readFileSync(filePath, 'utf-8');
              files++;
              lines += content.split('\n').length;

              if (filePath.includes('.test.') || filePath.includes('.spec.')) {
                hasTests = true;
              }
            } catch {
              // Ignorar
            }
          }
        });
      } catch {
        // Directorio no existe
      }
    });

    const size = formatSize(getDirSize(pkg.path));

    // Intentar obtener coverage
    let coverage: string | undefined;
    try {
      const coveragePath = join(pkg.path, 'coverage', 'coverage-summary.json');
      const coverageData = JSON.parse(readFileSync(coveragePath, 'utf-8'));
      const pct = coverageData.total?.lines?.pct;
      if (pct !== undefined) {
        coverage = `${pct}%`;
      }
    } catch {
      // No hay coverage
    }

    return { name: pkg.name, files, lines, size, hasTests, coverage };
  });
}

function getDependencyMetrics(): DependencyMetrics {
  let total = 0;
  let production = 0;
  let development = 0;

  try {
    const pkgPath = join(paths.root, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    production = Object.keys(pkg.dependencies || {}).length;
    development = Object.keys(pkg.devDependencies || {}).length;
    total = production + development;
  } catch {
    // Ignorar
  }

  // Contar outdated
  let outdated = 0;
  const outdatedResult = exec('pnpm outdated --json 2>/dev/null', {
    cwd: paths.root,
    silent: true,
    stdio: 'pipe',
  });
  if (outdatedResult.stdout) {
    try {
      const data = JSON.parse(outdatedResult.stdout);
      outdated = Object.keys(data).length;
    } catch {
      // Ignorar
    }
  }

  return { total, production, development, outdated };
}

function getTechnicalDebtMetrics(): TechnicalDebtMetrics {
  let anyTypes = 0;
  let todos = 0;
  let fixmes = 0;
  let barrelExports = 0;

  const dirs = ['apps', 'packages'];
  const patterns = {
    anyTypes: [/:\s*any\b/g, /\bas\s+any\b/g],
    todos: [/TODO:/gi, /TODO\(/gi],
    fixmes: [/FIXME:/gi, /FIXME\(/gi],
    barrels: [/export\s+\*\s+from/g],
  };

  for (const dir of dirs) {
    const fullPath = join(paths.root, dir);
    walkDir(fullPath, (filePath) => {
      if (
        (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
        !filePath.includes('node_modules') &&
        !filePath.includes('dist') &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.')
      ) {
        try {
          const content = readFileSync(filePath, 'utf-8');

          for (const pattern of patterns.anyTypes) {
            const matches = content.match(pattern);
            if (matches) anyTypes += matches.length;
          }

          for (const pattern of patterns.todos) {
            const matches = content.match(pattern);
            if (matches) todos += matches.length;
          }

          for (const pattern of patterns.fixmes) {
            const matches = content.match(pattern);
            if (matches) fixmes += matches.length;
          }

          for (const pattern of patterns.barrels) {
            const matches = content.match(pattern);
            if (matches) barrelExports += matches.length;
          }
        } catch {
          // Ignorar
        }
      }
    });
  }

  return { anyTypes, todos, fixmes, barrelExports };
}

function displayMetrics(metrics: {
  codebase: CodebaseMetrics;
  packages: PackageMetrics[];
  dependencies: DependencyMetrics;
  technicalDebt: TechnicalDebtMetrics;
}): void {
  // Codebase
  logger.subheader('Codebase');
  logger.keyValue({
    'Total archivos': String(metrics.codebase.totalFiles),
    'Total líneas': metrics.codebase.totalLines.toLocaleString(),
  });

  console.log('\n  Por extensión:');
  for (const [ext, data] of Object.entries(metrics.codebase.byExtension)) {
    console.log(`    ${ext}: ${data.files} archivos, ${data.lines.toLocaleString()} líneas`);
  }

  // Packages
  logger.subheader('Paquetes');
  console.log('');
  console.log('  Package                    Files    Lines      Size    Tests    Coverage');
  console.log('  ' + '-'.repeat(75));

  for (const pkg of metrics.packages) {
    const name = pkg.name.padEnd(24);
    const files = String(pkg.files).padStart(5);
    const lines = pkg.lines.toLocaleString().padStart(8);
    const size = pkg.size.padStart(10);
    const tests = pkg.hasTests ? colors.success('✓') : colors.warning('✗');
    const coverage = pkg.coverage ? pkg.coverage.padStart(10) : '      N/A';

    console.log(`  ${name} ${files} ${lines} ${size}      ${tests}  ${coverage}`);
  }

  // Dependencies
  logger.subheader('Dependencias');
  logger.keyValue({
    Total: String(metrics.dependencies.total),
    Producción: String(metrics.dependencies.production),
    Desarrollo: String(metrics.dependencies.development),
    Desactualizadas:
      metrics.dependencies.outdated > 0
        ? colors.warning(String(metrics.dependencies.outdated))
        : colors.success('0'),
  });

  // Technical Debt
  logger.subheader('Deuda Técnica');
  const colorize = (value: number, warn: number, error: number) => {
    if (value >= error) return colors.error(String(value));
    if (value >= warn) return colors.warning(String(value));
    return colors.success(String(value));
  };

  logger.keyValue({
    'Tipos any': colorize(metrics.technicalDebt.anyTypes, 10, 50),
    TODOs: colorize(metrics.technicalDebt.todos, 20, 100),
    FIXMEs: colorize(metrics.technicalDebt.fixmes, 5, 20),
    'Barrel exports': colorize(metrics.technicalDebt.barrelExports, 5, 20),
  });

  // Score
  const debtScore = Math.max(
    0,
    100 -
      metrics.technicalDebt.anyTypes * 0.5 -
      metrics.technicalDebt.todos * 0.1 -
      metrics.technicalDebt.fixmes * 0.5 -
      metrics.technicalDebt.barrelExports * 2
  );

  const scoreColor =
    debtScore >= 80 ? colors.success : debtScore >= 60 ? colors.warning : colors.error;

  console.log(
    `\n  ${colors.bold('Technical Debt Score:')} ${scoreColor(`${Math.round(debtScore)}/100`)}`
  );
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
        // Ignorar
      }
    }
  } catch {
    // Ignorar
  }
}

// Agregar comando al CLI
export { metricsCommand as default };
