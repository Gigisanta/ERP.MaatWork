#!/usr/bin/env node

/**
 * Script cross-platform para instalar dependencias Python
 * Instala las dependencias desde requirements.txt del analytics-service
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const analyticsServicePath = path.join(projectRoot, 'apps', 'analytics-service');
const requirementsPath = path.join(analyticsServicePath, 'requirements.txt');

const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

/**
 * Encontrar comando Python disponible (3.10+)
 */
function findPythonCommand() {
  const pythonCommands = isWindows 
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      // AI_DECISION: Timeout corto para detección de comandos
      // Justificación: Algunos comandos pueden colgarse si el ejecutable está corrupto o es un placeholder de Windows Store
      // Impacto: Detección más rápida de binarios válidos
      const version = execSync(`${cmd} --version`, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        timeout: 2000 // 2 segundos max
      });
      if (version.includes('Python 3')) {
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major >= 3 && minor >= 10) {
            return { cmd, version: version.trim() };
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Encontrar comando pip disponible
 */
function findPipCommand(pythonCmd) {
  // Primero intentar con el módulo pip de Python encontrado
  if (pythonCmd) {
    try {
      execSync(`${pythonCmd} -m pip --version`, { encoding: 'utf8', stdio: 'pipe' });
      return `${pythonCmd} -m pip`;
    } catch {
      // Continuar con otros comandos
    }
  }

  const pipCommands = isWindows
    ? ['pip', 'pip3', 'python -m pip', 'py -m pip']
    : ['pip3', 'pip', 'python3 -m pip', 'python -m pip'];
  
  for (const cmd of pipCommands) {
    try {
      execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Verificar que requirements.txt existe
 */
function checkRequirementsFile() {
  if (!fs.existsSync(requirementsPath)) {
    console.log(error(`❌ No se encontró requirements.txt en ${analyticsServicePath}`));
    return false;
  }
  return true;
}

/**
 * Instalar dependencias usando pip
 */
function installDependencies(pipCmd) {
  // AI_DECISION: Verificar si ya están instaladas para evitar esperas innecesarias
  // Justificación: pnpm i se queda trabado si pip intenta reinstalar todo cada vez
  // Impacto: Instalación mucho más rápida si ya se hizo previamente
  try {
    const isFastapiInstalled = execSync(`${pipCmd} show fastapi`, { stdio: 'pipe' });
    const isYfinanceInstalled = execSync(`${pipCmd} show yfinance`, { stdio: 'pipe' });
    
    if (isFastapiInstalled && isYfinanceInstalled) {
      console.log(success('✨ Dependencias críticas ya detectadas. Saltando instalación completa.'));
      console.log(dim('   (Usa SKIP_PYTHON_INSTALL=false si necesitas forzar actualización)'));
      return true;
    }
  } catch {
    // Si falla el check, procedemos con la instalación normal
  }

  console.log(info('📦 Instalando dependencias desde requirements.txt...'));
  console.log('');

  try {
    // Actualizar pip primero
    console.log(info('  ⬆️  Actualizando pip...'));
    execSync(`${pipCmd} install --upgrade pip`, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: analyticsServicePath 
    });
    console.log('');

    // Instalar dependencias
    console.log(info('  📥 Instalando paquetes...'));
    execSync(`${pipCmd} install -r "${requirementsPath}"`, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: analyticsServicePath 
    });

    return true;
  } catch (err) {
    console.log('');
    console.log(error(`❌ Error instalando dependencias: ${err.message}`));
    return false;
  }
}

/**
 * Verificar paquetes críticos post-instalación
 */
function verifyInstallation(pipCmd) {
  const criticalPackages = ['fastapi', 'uvicorn', 'yfinance', 'pandas'];
  let allInstalled = true;

  console.log('');
  console.log(info('🔍 Verificando instalación...'));

  for (const pkg of criticalPackages) {
    try {
      execSync(`${pipCmd} show ${pkg}`, { encoding: 'utf8', stdio: 'pipe' });
      console.log(success(`  ✅ ${pkg}`));
    } catch {
      console.log(error(`  ❌ ${pkg} no se instaló correctamente`));
      allInstalled = false;
    }
  }

  return allInstalled;
}

/**
 * Función principal
 */
function main() {
  console.log('');
  console.log(info('🐍 Instalador de dependencias Python para analytics-service'));
  console.log(info('═'.repeat(55)));
  console.log('');

  // AI_DECISION: Permitir saltar la instalación de Python
  // Justificación: En entornos CI o si el usuario no usa el servicio de analytics
  // Impacto: Evita fallos en la instalación general de pnpm
  if (process.env.PYTHON_SKIP_INSTALL === 'true' || process.env.SKIP_PYTHON_INSTALL === 'true') {
    console.log(warning('⏭️  Saltando instalación de dependencias Python (PYTHON_SKIP_INSTALL=true)'));
    process.exit(0);
  }

  // Verificar Python
  const python = findPythonCommand();
  if (!python) {
    console.log(warning('⚠️  Python 3.10+ no está instalado o no está en PATH'));
    console.log(warning('   El servicio de analytics no estará disponible'));
    console.log(warning('   Para habilitarlo, instala Python desde https://www.python.org/downloads/'));
    console.log('');
    console.log(warning('   Continuando sin dependencias Python...'));
    process.exit(0); // No bloquear pnpm install
  }

  console.log(success(`✅ Python encontrado: ${python.version}`));
  console.log(info(`   Comando: ${python.cmd}`));
  console.log('');

  // Verificar pip
  const pipCmd = findPipCommand(python.cmd);
  if (!pipCmd) {
    console.log(error('❌ pip no está disponible'));
    console.log(error('   Instala pip ejecutando: python -m ensurepip --upgrade'));
    process.exit(1);
  }

  try {
    const pipVersion = execSync(`${pipCmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(success(`✅ pip encontrado: ${pipVersion.trim()}`));
  } catch {
    console.log(warning(`⚠️  pip encontrado: ${pipCmd}`));
  }
  console.log('');

  // Verificar requirements.txt
  if (!checkRequirementsFile()) {
    process.exit(1);
  }
  console.log(success(`✅ requirements.txt encontrado`));
  console.log('');

  // Instalar dependencias
  if (!installDependencies(pipCmd)) {
    process.exit(1);
  }

  // Verificar instalación
  if (!verifyInstallation(pipCmd)) {
    console.log('');
    console.log(error('❌ Algunas dependencias no se instalaron correctamente'));
    console.log(warning('   Intenta ejecutar manualmente:'));
    console.log(warning(`   cd ${analyticsServicePath}`));
    console.log(warning(`   ${pipCmd} install -r requirements.txt`));
    process.exit(1);
  }

  console.log('');
  console.log(success('═'.repeat(55)));
  console.log(success('✅ Dependencias Python instaladas correctamente'));
  console.log('');
  console.log(info('Para iniciar el servicio:'));
  console.log(info('  pnpm -F @maatwork/analytics-service dev'));
  console.log('');
  process.exit(0);
}

// Ejecutar
main();










































