#!/usr/bin/env node

/**
 * Script wrapper para desarrollo cross-platform
 * Detecta el OS y ejecuta el comando apropiado
 * Incluye validaciones pre-inicio y health checks
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;

/**
 * Ejecutar validaciones antes de iniciar
 */
async function runValidations() {
  console.log(bold.cyan('\n🔍 Ejecutando validaciones pre-inicio...\n'));
  
  try {
    // Validar dependencias
    console.log(info('1️⃣  Validando dependencias del sistema...'));
    try {
      // Ejecutar validación pero capturar errores para no salir inmediatamente
      execSync('node scripts/dev-validate-deps.js', { 
        stdio: 'inherit',
        cwd: projectRoot 
      });
    } catch (err) {
      // Si hay errores críticos, el script ya los mostró y salió con código 1
      // Continuamos para mostrar todas las validaciones
    }
    console.log('');
    
    // Validar variables de entorno
    console.log(info('2️⃣  Validando variables de entorno...'));
    try {
      execSync('node scripts/dev-validate-env.js', { 
        stdio: 'inherit',
        cwd: projectRoot 
      });
    } catch (err) {
      // Si hay errores críticos, el script ya los mostró
      // Continuamos pero advertimos al usuario
      console.log(warning('\n⚠️  Hay problemas con las variables de entorno'));
      console.log(warning('   El sistema puede no funcionar correctamente\n'));
    }
    console.log('');
    
    console.log(success('✅ Validaciones completadas\n'));
    
  } catch (err) {
    console.log(error('❌ Error durante las validaciones:'), err.message);
    console.log(warning('   Continuando de todas formas...\n'));
  }
}

/**
 * Función principal
 */
async function main() {
  console.log(bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
  console.log(bold.cyan('║     CACTUS CRM - Modo Desarrollo                        ║'));
  console.log(bold.cyan('╚═══════════════════════════════════════════════════════════╝'));
  console.log('');
  
  // Ejecutar validaciones (opcional, puede ser deshabilitado con --skip-validation)
  const skipValidation = process.argv.includes('--skip-validation');
  
  if (!skipValidation) {
    await runValidations();
  } else {
    console.log(warning('⚠️  Validaciones omitidas (--skip-validation)\n'));
  }
  
  if (isWindows) {
    // Windows: Usar turbo run dev (sin tmux)
    console.log(bold('🚀 Iniciando servicios (Windows)...\n'));
    console.log(info('💡 En Windows, los servicios se ejecutarán en paralelo con Turbo.'));
    console.log(info('💡 Para ver logs individuales, abre terminales separadas:'));
    console.log(info('   • Terminal 1: cd apps/api && pnpm dev'));
    console.log(info('   • Terminal 2: cd apps/web && pnpm dev'));
    console.log('');
    
    try {
      // Ejecutar turbo run dev --parallel
      execSync('pnpm turbo run dev --parallel', {
        stdio: 'inherit',
        cwd: projectRoot
      });
    } catch (err) {
      // Ctrl+C es normal, solo salir
      if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
        console.log('\n' + info('👋 Saliendo...'));
        process.exit(0);
      }
      process.exit(1);
    }
  } else {
    // Unix/Linux/macOS: Intentar usar tmux si está disponible
    const bashScript = path.join(projectRoot, 'scripts', 'dev-tmux.sh');
    
    // Verificar si tmux está instalado
    let hasTmux = false;
    try {
      execSync('command -v tmux', { stdio: 'ignore' });
      hasTmux = true;
    } catch (err) {
      hasTmux = false;
    }
    
    if (hasTmux && fs.existsSync(bashScript)) {
      // Usar tmux script
      console.log(bold('🚀 Iniciando servicios con TMUX...\n'));
      try {
        execSync(`bash "${bashScript}"`, {
          stdio: 'inherit',
          cwd: projectRoot
        });
      } catch (err) {
        // Ctrl+C es normal, solo salir
        if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
          console.log('\n' + info('👋 Saliendo...'));
          process.exit(0);
        }
        process.exit(1);
      }
    } else {
      // Fallback a turbo run dev (sin tmux)
      console.log(warning('⚠️  TMUX no está instalado. Usando modo básico (turbo run dev)...'));
      console.log('');
      console.log(info('💡 Para mejor experiencia, instala TMUX:'));
      console.log(info('   • macOS:   brew install tmux'));
      console.log(info('   • Ubuntu:  sudo apt-get install tmux'));
      console.log(info('   • Arch:    sudo pacman -S tmux'));
      console.log('');
      
      try {
        execSync('pnpm turbo run dev --parallel', {
          stdio: 'inherit',
          cwd: projectRoot
        });
      } catch (err) {
        // Ctrl+C es normal, solo salir
        if (err.signal === 'SIGINT' || err.signal === 'SIGTERM') {
          console.log('\n' + info('👋 Saliendo...'));
          process.exit(0);
        }
        process.exit(1);
      }
    }
  }
}

// Ejecutar función principal
main().catch((err) => {
  // Usar la variable error definida arriba, o fallback a string simple
  try {
    console.error(error('❌ Error fatal:'), err);
  } catch {
    console.error('❌ Error fatal:', err);
  }
  process.exit(1);
});

