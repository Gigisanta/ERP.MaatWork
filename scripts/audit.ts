import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * AI_DECISION: Centralized audit script for code quality
 * Justificación: Audita tipos 'any' y barrel exports para mantener calidad del código
 * Impacto: Mejora la calidad del código identificando uso excesivo de 'any' y barrel exports problemáticos
 */

const rootDir = process.cwd();

function getColorizedScore(score: number) {
  if (score >= 90) return chalk.green(score.toString());
  if (score >= 70) return chalk.yellow(score.toString());
  return chalk.red(score.toString());
}

function countOccurrences(patterns: RegExp[], extensions: string[]): number {
  let count = 0;
  const dirs = ['apps', 'packages'];

  for (const dir of dirs) {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) continue;

    walkDir(fullPath, (filePath) => {
      const ext = path.extname(filePath);
      if (
        extensions.includes(ext) &&
        !filePath.includes('node_modules') &&
        !filePath.includes('dist') &&
        !filePath.includes('.next') &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.') &&
        !filePath.includes('__tests__')
      ) {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches) {
            count += matches.length;
          }
        }
      }
    });
  }

  return count;
}

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

async function runAudit() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(chalk.cyan('\n🚀 MAATWORK Unified Audit System\n'));
    console.log('Usage: pnpm audit:code [options]\n');
    console.log('Options:');
    console.log('  --ci       Exit with error code 1 if issues are found (ideal for CI)');
    console.log('  --types    Audit only "any" type usages');
    console.log('  --barrels  Audit only barrel exports');
    console.log('  --help     Show this help message\n');
    console.log('Description:');
    console.log(
      '  Audits "any" types usage and checks for barrel exports.'
    );
    console.log('  Calculates an overall Cleanliness Score for the codebase.\n');
    process.exit(0);
  }

  const mode = {
    full: !process.argv.includes('--types') && !process.argv.includes('--barrels'),
    types: process.argv.includes('--types'),
    barrels: process.argv.includes('--barrels'),
  };

  console.log(chalk.cyan('\n🔍 Starting unified codebase audit...\n'));

  const results = {
    anyTypes: { success: false, count: 0 },
    barrels: { success: false, count: 0 },
  };

  // 1. Audit "any" types usage
  if (mode.full || mode.types) {
    console.log(chalk.yellow(`${mode.full ? '1️⃣  ' : ''}Auditing "any" types usage...`));
    try {
      results.anyTypes.count = countOccurrences([/:\s*any\b/g, /\bas\s+any\b/g], ['.ts', '.tsx']);
      results.anyTypes.success = results.anyTypes.count === 0;
      console.log(`   Found ${results.anyTypes.count} usages of 'any'.`);
    } catch (error) {
      console.log(chalk.red('   Failed to audit "any" types.'));
    }
  }

  // 2. Audit barrel exports (export *)
  if (mode.full || mode.barrels) {
    console.log(
      chalk.yellow(`${mode.full ? '\n2️⃣  ' : ''}Auditing barrel exports (export * from...)...`)
    );
    try {
      results.barrels.count = countOccurrences([/export\s+\*\s+from/g], ['.ts', '.tsx']);
      results.barrels.success = results.barrels.count === 0;
      console.log(`   Found ${results.barrels.count} barrel exports.`);
    } catch (error) {
      console.log(chalk.red('   Failed to audit barrel exports.'));
    }
  }

  if (!mode.full) {
    process.exit(0);
  }

  // 3. Calculate Cleanliness Score
  console.log(chalk.cyan('\n📊 Audit Summary & Cleanliness Score:'));

  // Weights: Any types (50), Barrels (50)
  const anyScore = Math.max(0, 50 - results.anyTypes.count * 2); // 2 puntos por cada 'any'
  const barrelScore = Math.max(0, 50 - results.barrels.count * 5); // 5 puntos por cada barrel export

  const totalScore = Math.round(anyScore + barrelScore);

  console.log(
    `   - 'any' types:       ${results.anyTypes.count > 0 ? chalk.yellow(results.anyTypes.count) : chalk.green('0')}`
  );
  console.log(
    `   - Barrel exports:    ${results.barrels.count > 0 ? chalk.yellow(results.barrels.count) : chalk.green('0')}`
  );

  console.log(chalk.bold(`\n✨ Overall Cleanliness Score: ${getColorizedScore(totalScore)}/100\n`));

  // Fallar en CI si hay problemas
  if (process.argv.includes('--ci')) {
    const hasIssues = results.anyTypes.count > 0 || results.barrels.count > 0;
    if (hasIssues) {
      console.log(
        chalk.blue(
          '💡 Tip: Reduce el uso de tipos "any" y barrel exports para mejorar el score.\n'
        )
      );
      process.exit(1);
    }
  }
}

runAudit().catch((err) => {
  console.error(chalk.red('\nFATAL: Audit script failed unexpectedly:'), err);
  process.exit(1);
});
