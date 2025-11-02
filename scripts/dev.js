#!/usr/bin/env node

/**
 * Script wrapper para desarrollo cross-platform
 * Detecta el OS y ejecuta el comando apropiado
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

if (isWindows) {
  // Windows: Usar turbo run dev (sin tmux)
  console.log('🚀 Iniciando Cactus CRM en modo desarrollo (Windows)...');
  console.log('');
  console.log('💡 En Windows, los servicios se ejecutarán en paralelo con Turbo.');
  console.log('💡 Para ver logs individuales, abre terminales separadas:');
  console.log('   • Terminal 1: cd apps/api && pnpm dev');
  console.log('   • Terminal 2: cd apps/web && pnpm dev');
  console.log('');
  
  try {
    // Ejecutar turbo run dev --parallel
    execSync('pnpm turbo run dev --parallel', {
      stdio: 'inherit',
      cwd: projectRoot
    });
  } catch (error) {
    // Ctrl+C es normal, solo salir
    process.exit(0);
  }
} else {
  // Unix/Linux/macOS: Intentar usar tmux si está disponible
  const bashScript = path.join(projectRoot, 'scripts', 'dev-tmux.sh');
  
  // Verificar si tmux está instalado
  let hasTmux = false;
  try {
    execSync('command -v tmux', { stdio: 'ignore' });
    hasTmux = true;
  } catch (error) {
    hasTmux = false;
  }
  
  if (hasTmux && fs.existsSync(bashScript)) {
    // Usar tmux script
    try {
      execSync(`bash "${bashScript}"`, {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (error) {
      // Ctrl+C es normal, solo salir
      process.exit(0);
    }
  } else {
    // Fallback a turbo run dev (sin tmux)
    console.log('⚠️  TMUX no está instalado. Usando modo básico (turbo run dev)...');
    console.log('');
    console.log('💡 Para mejor experiencia, instala TMUX:');
    console.log('   • macOS:   brew install tmux');
    console.log('   • Ubuntu:  sudo apt-get install tmux');
    console.log('   • Arch:    sudo pacman -S tmux');
    console.log('');
    
    try {
      execSync('pnpm turbo run dev --parallel', {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (error) {
      // Ctrl+C es normal, solo salir
      process.exit(0);
    }
  }
}

