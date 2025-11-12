#!/usr/bin/env node

/**
 * Script wrapper para limpiar entorno de desarrollo
 * Detecta el OS y ejecuta el script correspondiente (bash o PowerShell)
 * 
 * AI_DECISION: Optimizado para ser más rápido y menos verboso
 * Justificación: En desarrollo frecuente, limpieza debe ser rápida y silenciosa
 * Impacto: Predev hook más rápido, menos overhead en inicio
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const isQuiet = process.argv.includes('--quiet') || process.env.CI === 'true';

if (isWindows) {
  // Windows: Ejecutar PowerShell
  const psScript = path.join(projectRoot, 'scripts', 'dev-clean.ps1');
  
  if (fs.existsSync(psScript)) {
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
        stdio: 'inherit',
        cwd: projectRoot
      });
      // Si llegamos aquí, el script se ejecutó correctamente
      // El script PowerShell ahora retorna exit 0 si todo está bien, exit 1 si hay problemas
    } catch (error) {
      // Si el script PowerShell retorna exit 1, el proceso falla
      // Esto es intencional - queremos que el usuario sepa que hay problemas
      if (error.status === 1 && !isQuiet) {
        console.error('\n❌ No se pudieron liberar todos los puertos.');
        console.error('   Por favor, cierra manualmente los procesos que usan los puertos 3000, 3001 o 3002');
        console.error('   y vuelve a intentar.\n');
        process.exit(1);
      }
      // Otros errores pueden ser ignorados (procesos que no existen, etc.)
      // En modo quiet, no fallar si no hay procesos corriendo
      if (error.status === 1 && isQuiet) {
        process.exit(0);
      } else {
        process.exit(0);
      }
    }
  } else {
    console.warn('⚠️  dev-clean.ps1 no encontrado');
    process.exit(0);
  }
} else {
  // Unix/Linux/macOS: Ejecutar bash
  const bashScript = path.join(projectRoot, 'scripts', 'dev-clean.sh');
  
  if (fs.existsSync(bashScript)) {
    try {
      execSync(`bash "${bashScript}"`, {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (error) {
      // Ignorar errores de procesos que no existen
      process.exit(0);
    }
  } else {
    console.warn('⚠️  dev-clean.sh no encontrado');
    process.exit(0);
  }
}

