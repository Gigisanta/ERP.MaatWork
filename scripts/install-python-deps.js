#!/usr/bin/env node

/**
 * Script cross-platform para instalar dependencias Python
 * Detecta pip disponible e instala desde requirements.txt
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

/**
 * Encontrar comando pip disponible
 */
function findPipCommand() {
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
function checkRequirements() {
  if (!fs.existsSync(requirementsPath)) {
    console.error(error(`❌ No se encontró requirements.txt en ${analyticsServicePath}`));
    process.exit(1);
  }
}

/**
 * Instalar dependencias
 */
function installDependencies() {
  const pipCmd = findPipCommand();
  
  if (!pipCmd) {
    console.error(error('❌ pip no está instalado o no está en PATH'));
    console.error(error('   Instala Python 3.10+ que incluye pip'));
    console.error(error('   O instala pip manualmente: https://pip.pypa.io/en/stable/installation/'));
    process.exit(1);
  }

  checkRequirements();

  console.log(info('📦 Instalando dependencias Python...'));
  console.log(info(`   Usando: ${pipCmd} install -r requirements.txt`));
  console.log('');

  try {
    execSync(`${pipCmd} install -r requirements.txt`, {
      cwd: analyticsServicePath,
      stdio: 'inherit'
    });
    console.log('');
    console.log(success('✅ Dependencias Python instaladas correctamente'));
  } catch (err) {
    console.error('');
    console.error(error('❌ Error al instalar dependencias Python'));
    console.error(error(`   Comando: ${pipCmd} install -r requirements.txt`));
    process.exit(1);
  }
}

// Ejecutar
installDependencies();

