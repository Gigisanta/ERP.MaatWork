#!/usr/bin/env node
/**
 * Script de verificación completa
 * 
 * AI_DECISION: Script de verificación completa para CI/CD
 * Justificación: Verificación automatizada asegura calidad antes de merge
 * Impacto: Detecta problemas temprano, mantiene estándares de calidad
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = `${__dirname}/..`;

const SKIP_E2E = process.env.SKIP_E2E === 'true';

function runCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, { 
      cwd: rootDir, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`✅ ${description} completado`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} falló`);
    return false;
  }
}

async function main() {
  console.log('🔍 Iniciando verificación completa...\n');
  
  const results = {
    typecheck: false,
    lint: false,
    format: false,
    build: false,
    test: false,
    coverage: false,
    e2e: false
  };
  
  // 1. Typecheck
  results.typecheck = runCommand('pnpm typecheck', '1️⃣ Verificando tipos TypeScript');
  
  // 2. Lint
  results.lint = runCommand('pnpm lint', '2️⃣ Ejecutando linter');
  
  // 3. Format check
  results.format = runCommand('pnpm format:check', '3️⃣ Verificando formato con Prettier');
  
  // 4. Build
  results.build = runCommand('pnpm build', '4️⃣ Construyendo proyectos');
  
  // 5. Tests unitarios
  results.test = runCommand('pnpm test', '5️⃣ Ejecutando tests unitarios');
  
  // 6. Coverage check (no crítico)
  try {
    runCommand('pnpm test:coverage:check', '6️⃣ Verificando coverage');
    results.coverage = true;
  } catch {
    console.log('⚠️  Coverage no cumple thresholds (continuando...)');
    results.coverage = false;
  }
  
  // 7. E2E tests (opcional)
  if (!SKIP_E2E) {
    try {
      runCommand('pnpm e2e', '7️⃣ Ejecutando tests E2E');
      results.e2e = true;
    } catch {
      console.log('⚠️  Tests E2E fallaron (continuando...)');
      results.e2e = false;
    }
  } else {
    console.log('\n7️⃣ Saltando tests E2E (SKIP_E2E=true)');
    results.e2e = true; // No fallar si se salta
  }
  
  // Resumen
  console.log('\n✅ Verificación completa finalizada!\n');
  console.log('📊 Resumen:');
  console.log(`   - Typecheck: ${results.typecheck ? '✅' : '❌'}`);
  console.log(`   - Lint: ${results.lint ? '✅' : '❌'}`);
  console.log(`   - Formato: ${results.format ? '✅' : '❌'}`);
  console.log(`   - Build: ${results.build ? '✅' : '❌'}`);
  console.log(`   - Tests: ${results.test ? '✅' : '❌'}`);
  console.log(`   - Coverage: ${results.coverage ? '✅' : '⚠️'}`);
  if (!SKIP_E2E) {
    console.log(`   - E2E: ${results.e2e ? '✅' : '⚠️'}`);
  }
  
  // Fallar si alguna verificación crítica falló
  const criticalFailed = !results.typecheck || !results.lint || !results.format || !results.build || !results.test;
  
  if (criticalFailed) {
    console.error('\n❌ Verificación falló en pasos críticos');
    process.exit(1);
  }
  
  console.log('\n🎉 Todas las verificaciones críticas pasaron!');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Error durante verificación:', error);
  process.exit(1);
});

