#!/usr/bin/env node
/**
 * AI_DECISION: Script multiplataforma para detectar artefactos trackeados
 * Justificación: xargs y bash no están disponibles en Windows
 * Impacto: Pre-commit hook funciona en Windows/Linux/Mac
 */

const { execSync } = require('child_process');

try {
  // Obtener lista de archivos trackeados por git
  const output = execSync('git ls-files', { encoding: 'utf8' });
  const files = output.split('\n').filter(Boolean);

  // Patrones prohibidos
  const forbiddenPatterns = [/\/node_modules\//, /\/dist\//, /\/build\//, /\.next\//, /\.turbo\//];

  let foundForbidden = false;

  for (const file of files) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(file)) {
        console.error(`❌ Forbidden artifact tracked: ${file}`);
        foundForbidden = true;
      }
    }
  }

  if (foundForbidden) {
    console.error('\n⚠️  Artifacts detected in git tracking!');
    console.error('Please remove them with: git rm --cached <file>');
    process.exit(1);
  }

  console.log('✅ No artifacts found in git tracking');
  process.exit(0);
} catch (error) {
  console.error('Error checking artifacts:', error.message);
  process.exit(1);
}
