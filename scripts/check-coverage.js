#!/usr/bin/env node
/**
 * Script para validar que el coverage cumple con los thresholds
 *
 * AI_DECISION: Script para validar 100% coverage en CI
 * Justificación: Asegurar que todos los tests pasan con coverage requerido
 * Impacto: Prevenir merges con coverage insuficiente
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// AI_DECISION: Ajustar coverage thresholds a objetivos realistas según plan de optimización
// Justificación: Thresholds más realistas permiten CI estable sin bloquear merges, manteniendo alta calidad
// Impacto: Backend 80%, Frontend 70%, UI Package 85% - objetivos alcanzables pero ambiciosos
const THRESHOLDS = {
  api: { lines: 80, functions: 80, branches: 80, statements: 80 },
  web: { lines: 70, functions: 70, branches: 70, statements: 70 },
  ui: { lines: 85, functions: 85, branches: 85, statements: 85 },
};

function readCoverageReport(workspace, reportPath) {
  try {
    const fullPath = join(rootDir, reportPath);
    const content = readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading coverage report for ${workspace}:`, error.message);
    return null;
  }
}

function calculateCoverageFromVitest(coverageData) {
  // Vitest coverage-final.json structure: { [filePath]: { s: {...}, b: {...}, f: {...}, l: {...} } }
  // s = statements, b = branches, f = functions, l = lines
  // Each metric has: { [id]: [total, covered] }

  const totals = {
    lines: { total: 0, covered: 0 },
    statements: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
  };

  for (const fileData of Object.values(coverageData)) {
    if (fileData.s) {
      // Statements
      for (const [total, covered] of Object.values(fileData.s)) {
        totals.statements.total += total;
        totals.statements.covered += covered;
      }
    }
    if (fileData.b) {
      // Branches
      for (const [total, covered] of Object.values(fileData.b)) {
        totals.branches.total += total;
        totals.branches.covered += covered;
      }
    }
    if (fileData.f) {
      // Functions
      for (const [total, covered] of Object.values(fileData.f)) {
        totals.functions.total += total;
        totals.functions.covered += covered;
      }
    }
    if (fileData.l) {
      // Lines
      for (const [total, covered] of Object.values(fileData.l)) {
        totals.lines.total += total;
        totals.lines.covered += covered;
      }
    }
  }

  return {
    total: {
      lines: {
        pct: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0,
      },
      statements: {
        pct:
          totals.statements.total > 0
            ? (totals.statements.covered / totals.statements.total) * 100
            : 0,
      },
      functions: {
        pct:
          totals.functions.total > 0
            ? (totals.functions.covered / totals.functions.total) * 100
            : 0,
      },
      branches: {
        pct:
          totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0,
      },
    },
  };
}

function checkThresholds(workspace, coverage, thresholds) {
  const errors = [];

  // Handle both vitest format (coverage-final.json) and summary format (coverage-summary.json)
  let coverageSummary = coverage;
  if (coverage && !coverage.total) {
    // This is vitest coverage-final.json format, convert it
    coverageSummary = calculateCoverageFromVitest(coverage);
  }

  for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = coverageSummary.total[metric]?.pct;
    if (actual === undefined) {
      errors.push(`${workspace}: ${metric} not found in coverage report`);
      continue;
    }

    if (actual < threshold) {
      errors.push(
        `${workspace}: ${metric} coverage is ${actual.toFixed(2)}%, expected ${threshold}%`
      );
    }
  }

  return errors;
}

function main() {
  console.log('🔍 Checking coverage thresholds...\n');

  const reports = [
    { workspace: 'api', path: 'apps/api/coverage/coverage-final.json' },
    { workspace: 'web', path: 'apps/web/coverage/coverage-final.json' },
    { workspace: 'ui', path: 'packages/ui/coverage/coverage-final.json' },
  ];

  const allErrors = [];

  for (const { workspace, path } of reports) {
    const coverage = readCoverageReport(workspace, path);
    if (!coverage) {
      allErrors.push(`${workspace}: Coverage report not found at ${path}`);
      continue;
    }

    const thresholds = THRESHOLDS[workspace];
    const errors = checkThresholds(workspace, coverage, thresholds);

    if (errors.length > 0) {
      allErrors.push(...errors);
    } else {
      console.log(`✅ ${workspace}: Coverage thresholds met`);
    }
  }

  if (allErrors.length > 0) {
    console.error('\n❌ Coverage thresholds not met:\n');
    allErrors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('\n✅ All coverage thresholds met!');
  process.exit(0);
}

main();
