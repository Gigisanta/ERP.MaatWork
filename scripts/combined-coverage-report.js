#!/usr/bin/env node
/**
 * Script para generar reporte combinado de coverage
 * 
 * AI_DECISION: Script para generar reporte único de coverage
 * Justificación: Facilitar visualización de coverage total del proyecto
 * Impacto: Mejor visibilidad de coverage en monorepo
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function readCoverageReport(reportPath) {
  try {
    const fullPath = join(rootDir, reportPath);
    const content = readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Could not read coverage report at ${reportPath}:`, error.message);
    return null;
  }
}

function combineCoverageReports() {
  const reports = [
    { workspace: 'api', path: 'apps/api/coverage/coverage-summary.json' },
    { workspace: 'web', path: 'apps/web/coverage/coverage-summary.json' },
    { workspace: 'ui', path: 'packages/ui/coverage/coverage-summary.json' }
  ];
  
  const combined = {
    total: {
      lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
      statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
    },
    workspaces: {}
  };
  
  for (const { workspace, path } of reports) {
    const coverage = readCoverageReport(path);
    if (!coverage) continue;
    
    const totals = coverage.total;
    combined.workspaces[workspace] = {
      lines: totals.lines?.pct || 0,
      statements: totals.statements?.pct || 0,
      functions: totals.functions?.pct || 0,
      branches: totals.branches?.pct || 0
    };
    
    // Sumar totals
    for (const metric of ['lines', 'statements', 'functions', 'branches']) {
      if (totals[metric]) {
        combined.total[metric].total += totals[metric].total || 0;
        combined.total[metric].covered += totals[metric].covered || 0;
        combined.total[metric].skipped += totals[metric].skipped || 0;
      }
    }
  }
  
  // Calcular porcentajes
  for (const metric of ['lines', 'statements', 'functions', 'branches']) {
    const total = combined.total[metric].total;
    const covered = combined.total[metric].covered;
    combined.total[metric].pct = total > 0 ? (covered / total) * 100 : 0;
  }
  
  return combined;
}

function formatReport(combined) {
  console.log('\n📊 Combined Coverage Report\n');
  console.log('═'.repeat(60));
  console.log('Workspace Coverage:');
  console.log('─'.repeat(60));
  
  for (const [workspace, coverage] of Object.entries(combined.workspaces)) {
    console.log(`\n${workspace.toUpperCase()}:`);
    console.log(`  Lines:      ${coverage.lines.toFixed(2)}%`);
    console.log(`  Statements: ${coverage.statements.toFixed(2)}%`);
    console.log(`  Functions:  ${coverage.functions.toFixed(2)}%`);
    console.log(`  Branches:   ${coverage.branches.toFixed(2)}%`);
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('\nTOTAL:');
  console.log(`  Lines:      ${combined.total.lines.pct.toFixed(2)}% (${combined.total.lines.covered}/${combined.total.lines.total})`);
  console.log(`  Statements: ${combined.total.statements.pct.toFixed(2)}% (${combined.total.statements.covered}/${combined.total.statements.total})`);
  console.log(`  Functions:  ${combined.total.functions.pct.toFixed(2)}% (${combined.total.functions.covered}/${combined.total.functions.total})`);
  console.log(`  Branches:   ${combined.total.branches.pct.toFixed(2)}% (${combined.total.branches.covered}/${combined.total.branches.total})`);
  console.log('═'.repeat(60) + '\n');
}

function main() {
  console.log('📈 Generating combined coverage report...\n');
  
  const combined = combineCoverageReports();
  
  // Guardar reporte JSON
  const outputPath = join(rootDir, 'coverage-combined.json');
  writeFileSync(outputPath, JSON.stringify(combined, null, 2));
  console.log(`✅ Combined report saved to: ${outputPath}\n`);
  
  // Mostrar reporte formateado
  formatReport(combined);
}

main();


