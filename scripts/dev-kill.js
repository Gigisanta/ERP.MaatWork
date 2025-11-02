#!/usr/bin/env node

/**
 * Script wrapper para matar procesos de desarrollo
 * Detecta el OS y ejecuta el comando apropiado
 */

const { execSync } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

if (isWindows) {
  // Windows: Usar PowerShell para matar procesos
  const psScript = path.join(projectRoot, 'scripts', 'dev-clean.ps1');
  
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
      stdio: 'inherit',
      cwd: projectRoot
    });
  } catch (error) {
    // Ignorar errores
    process.exit(0);
  }
} else {
  // Unix/Linux/macOS: Matar sesión tmux y procesos
  try {
    // Matar sesión tmux si existe
    execSync('tmux kill-session -t cactus-dev 2>/dev/null || true', {
      stdio: 'ignore',
      cwd: projectRoot
    });
    
    // Matar procesos comunes
    execSync('pkill -f "tsx watch src/index.ts" 2>/dev/null || true', {
      stdio: 'ignore',
      cwd: projectRoot
    });
    execSync('pkill -f "next dev" 2>/dev/null || true', {
      stdio: 'ignore',
      cwd: projectRoot
    });
    execSync('pkill -f "python.*main.py" 2>/dev/null || true', {
      stdio: 'ignore',
      cwd: projectRoot
    });
  } catch (error) {
    // Ignorar errores
    process.exit(0);
  }
}

