#!/usr/bin/env node

/**
 * Script wrapper para limpiar entorno de desarrollo
 * Detecta el OS y ejecuta el script correspondiente (bash o PowerShell)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

if (isWindows) {
  // Windows: Ejecutar PowerShell
  const psScript = path.join(projectRoot, 'scripts', 'dev-clean.ps1');
  
  if (fs.existsSync(psScript)) {
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (error) {
      // Ignorar errores de procesos que no existen
      process.exit(0);
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

