#!/usr/bin/env node

/**
 * Script cross-platform para verificar dependencias Python
 * Verifica que Python y las dependencias estén instaladas
 */

const { execSync } = require('child_process');
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

let hasErrors = false;
let hasWarnings = false;

/**
 * Encontrar comando Python disponible
 */
function findPythonCommand() {
  const pythonCommands = isWindows ? ['python', 'py', 'python3'] : ['python3', 'python'];

  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
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
 * Verificar que requirements.txt existe
 */
function checkRequirementsFile() {
  if (!fs.existsSync(requirementsPath)) {
    console.log(error(`  ❌ No se encontró requirements.txt en ${analyticsServicePath}`));
    hasErrors = true;
    return false;
  }
  return true;
}

/**
 * Verificar dependencias instaladas
 */
function checkInstalledDependencies() {
  const pipCommands = isWindows
    ? ['pip', 'pip3', 'python -m pip', 'py -m pip']
    : ['pip3', 'pip', 'python3 -m pip', 'python -m pip'];

  let pipCmd = null;
  for (const cmd of pipCommands) {
    try {
      execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      pipCmd = cmd;
      break;
    } catch {
      continue;
    }
  }

  if (!pipCmd) {
    console.log(warning('  ⚠️  pip no está disponible, no se puede verificar dependencias'));
    hasWarnings = true;
    return false;
  }

  // Leer requirements.txt y verificar paquetes principales
  const requirements = fs.readFileSync(requirementsPath, 'utf8');
  const packages = requirements
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/[>=<!=]/)[0].trim());

  const criticalPackages = ['fastapi', 'uvicorn', 'yfinance'];
  let allInstalled = true;

  for (const pkg of criticalPackages) {
    try {
      execSync(`${pipCmd} show ${pkg}`, { encoding: 'utf8', stdio: 'pipe' });
    } catch {
      console.log(warning(`  ⚠️  Paquete ${pkg} no está instalado`));
      allInstalled = false;
      hasWarnings = true;
    }
  }

  if (allInstalled) {
    console.log(success('  ✅ Dependencias Python principales instaladas'));
  }

  return allInstalled;
}

/**
 * Función principal
 */
function main() {
  console.log(info('🐍 Verificando Python y dependencias...'));
  console.log('');

  // Verificar Python
  const python = findPythonCommand();
  if (python) {
    console.log(success(`  ✅ Python encontrado: ${python.version}`));
    console.log(info(`     Comando: ${python.cmd}`));
  } else {
    console.log(error('  ❌ Python 3.10+ no está instalado o no está en PATH'));
    console.log(error('     Instala Python desde https://www.python.org/downloads/'));
    hasErrors = true;
  }

  console.log('');

  // Verificar requirements.txt
  if (!checkRequirementsFile()) {
    return;
  }

  // Verificar dependencias instaladas
  checkInstalledDependencies();

  console.log('');

  if (hasErrors) {
    console.log(error('❌ Hay errores críticos'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(warning('⚠️  Hay advertencias'));
    console.log(warning('   Ejecuta: pnpm -F @cactus/analytics-service install'));
    process.exit(0);
  } else {
    console.log(success('✅ Python y dependencias están listas'));
    process.exit(0);
  }
}

// Ejecutar
main();
