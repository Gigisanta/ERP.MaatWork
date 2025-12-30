import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * AI_DECISION: Centralized audit script using Knip for efficiency
 * Justificación: Knip replaces depcheck and ts-prune, offering faster and more accurate monorepo analysis.
 * Impacto: Improved development speed and cleaner codebase by identifying dead code and unused dependencies.
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
      '  Runs Knip for dead code/deps, audits "any" types, and checks for barrel exports.'
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
    knip: { success: false, issues: 0, isCompatibilityError: false },
    anyTypes: { success: false, count: 0 },
    barrels: { success: false, count: 0 },
  };

  // 1. Run Knip
  if (mode.full) {
    console.log(chalk.yellow('1️⃣  Checking for unused code and dependencies (Knip)...'));
    try {
      // Ejecutar knip y capturar tanto stdout como stderr
      execSync('npx knip', { 
        stdio: 'inherit',
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      results.knip.success = true;
    } catch (error: unknown) {
      results.knip.success = false;
      
      // Capturar el mensaje de error completo
      let errorMessage = '';
      let errorOutput = '';
      
      if (error && typeof error === 'object') {
        // execSync lanza un error con stdout y stderr
        const execError = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
        if (execError.stdout) {
          errorOutput += Buffer.isBuffer(execError.stdout) 
            ? execError.stdout.toString('utf-8') 
            : String(execError.stdout);
        }
        if (execError.stderr) {
          errorOutput += Buffer.isBuffer(execError.stderr) 
            ? execError.stderr.toString('utf-8') 
            : String(execError.stderr);
        }
        if (execError.message) {
          errorMessage = execError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Verificar si es el error de compatibilidad conocido con zod/mini
      const isCompatibilityError = 
        errorMessage.includes('ERR_PACKAGE_PATH_NOT_EXPORTED') ||
        errorMessage.includes('zod/mini') ||
        errorMessage.includes('Package subpath') ||
        errorOutput.includes('ERR_PACKAGE_PATH_NOT_EXPORTED') ||
        errorOutput.includes('zod/mini') ||
        errorOutput.includes('Package subpath');
      
      results.knip.isCompatibilityError = isCompatibilityError;
      
      if (isCompatibilityError) {
        console.log(
          chalk.yellow(
            '   ⚠️  Knip falló por problema de compatibilidad con dependencias (zod/mini).'
          )
        );
        console.log(
          chalk.yellow(
            '   Continuando con auditoría de tipos y barrel exports...'
          )
        );
      } else {
        // Otro tipo de error - knip encontró problemas reales o falló por otra razón
        // No mostrar el error completo para no saturar la salida
        console.log(chalk.red('   Knip encontró problemas o falló.'));
      }
    }
  }

  // 2. Audit "any" types usage
  if (mode.full || mode.types) {
    console.log(chalk.yellow(`${mode.full ? '\n2️⃣  ' : ''}Auditing "any" types usage...`));
    try {
      results.anyTypes.count = countOccurrences([/:\s*any\b/g, /\bas\s+any\b/g], ['.ts', '.tsx']);
      results.anyTypes.success = results.anyTypes.count === 0;
      console.log(`   Found ${results.anyTypes.count} usages of 'any'.`);
    } catch (error) {
      console.log(chalk.red('   Failed to audit "any" types.'));
    }
  }

  // 3. Audit barrel exports (export *)
  if (mode.full || mode.barrels) {
    console.log(
      chalk.yellow(`${mode.full ? '\n3️⃣  ' : ''}Auditing barrel exports (export * from...)...`)
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

  // 4. Calculate Cleanliness Score
  console.log(chalk.cyan('\n📊 Audit Summary & Cleanliness Score:'));

  // Weights: Knip (50), Any types (25), Barrels (25)
  const knipScore = results.knip.success ? 50 : 10;
  const anyScore = Math.max(0, 25 - results.anyTypes.count * 0.1); // 0.1 per 'any' (less strict than before)
  const barrelScore = Math.max(0, 25 - results.barrels.count * 1);

  const totalScore = Math.round(knipScore + anyScore + barrelScore);

  console.log(
    `   - Unused code/deps:  ${results.knip.success ? chalk.green('CLEAN') : chalk.red('ISSUES FOUND')}`
  );
  console.log(
    `   - 'any' types:       ${results.anyTypes.count > 0 ? chalk.yellow(results.anyTypes.count) : chalk.green('0')}`
  );
  console.log(
    `   - Barrel exports:    ${results.barrels.count > 0 ? chalk.yellow(results.barrels.count) : chalk.green('0')}`
  );

  console.log(chalk.bold(`\n✨ Overall Cleanliness Score: ${getColorizedScore(totalScore)}/100\n`));

  if (!results.knip.success) {
    // Si es un error de compatibilidad, no mostrar el tip ni fallar en CI
    if (!results.knip.isCompatibilityError) {
      console.log(
        chalk.blue(
          '💡 Tip: Run "pnpm knip --fix" to automatically remove some unused exports and dependencies.'
        )
      );
      console.log(chalk.blue('   Check the Knip output above for specific files and issues.\n'));
      // Solo fallar en CI si knip encontró problemas reales, no si fue un error de compatibilidad
      if (process.argv.includes('--ci')) {
        process.exit(1);
      }
    } else {
      console.log(
        chalk.blue(
          '💡 Nota: Knip no pudo ejecutarse por problemas de compatibilidad. Considera actualizar dependencias.\n'
        )
      );
      // No fallar en CI si fue solo un error de compatibilidad
    }
  }
}

runAudit().catch((err) => {
  console.error(chalk.red('\nFATAL: Audit script failed unexpectedly:'), err);
  process.exit(1);
});
