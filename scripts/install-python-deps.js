#!/usr/bin/env node

/**
 * Script cross-platform para instalar dependencias Python
 * Instala las dependencias definidas en requirements.txt
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const analyticsServicePath = path.join(projectRoot, 'apps', 'analytics-service');
const requirementsPath = path.join(analyticsServicePath, 'requirements.txt');

/**
 * Encontrar comando Python disponible (Python 3.10+)
 */
function findPythonCommand() {
  const pythonCommands = isWindows 
    ? ['python', 'py', 'python3']
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      if (version.includes('Python 3')) {
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major >= 3 && minor >= 10) {
            return cmd;
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
  // Intentar usar pip a través de Python primero (más confiable)
  const pipViaPython = `${pythonCmd} -m pip`;
  
  try {
    execSync(`${pipViaPython} --version`, { encoding: 'utf8', stdio: 'pipe' });
    return pipViaPython;
  } catch {
    // Intentar comandos directos
    const pipCommands = isWindows
      ? ['pip', 'pip3']
      : ['pip3', 'pip'];
    
    for (const cmd of pipCommands) {
      try {
        execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
        return cmd;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Instalar dependencias
 */
function installDependencies() {
  console.log('🐍 Instalando dependencias Python...');
  console.log('');

  // Verificar Python
  const pythonCmd = findPythonCommand();
  if (!pythonCmd) {
    console.error('❌ Python 3.10+ no está instalado o no está en PATH');
    console.error('   Instala Python desde https://www.python.org/downloads/');
    process.exit(1);
  }

  const pythonVersion = execSync(`${pythonCmd} --version`, { encoding: 'utf8' }).trim();
  console.log(`✅ Python encontrado: ${pythonVersion}`);

  // Verificar pip
  const pipCmd = findPipCommand(pythonCmd);
  if (!pipCmd) {
    console.error('❌ pip no está disponible');
    console.error('   Ejecuta: python -m ensurepip --upgrade');
    process.exit(1);
  }

  console.log(`✅ pip encontrado: ${pipCmd}`);

  // Verificar requirements.txt
  if (!fs.existsSync(requirementsPath)) {
    console.error(`❌ No se encontró requirements.txt en ${analyticsServicePath}`);
    process.exit(1);
  }

  console.log('');
  console.log('📦 Instalando dependencias desde requirements.txt...');
  console.log('');

  try {
    // Actualizar pip primero
    console.log('🔄 Actualizando pip...');
    execSync(`${pipCmd} install --upgrade pip`, {
      stdio: 'inherit',
      cwd: analyticsServicePath,
    });

    // Instalar dependencias
    console.log('');
    console.log('📥 Instalando dependencias...');
    execSync(`${pipCmd} install -r requirements.txt`, {
      stdio: 'inherit',
      cwd: analyticsServicePath,
    });

    console.log('');
    console.log('✅ Dependencias Python instaladas correctamente');
  } catch (error) {
    console.error('');
    console.error('❌ Error al instalar dependencias');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar
installDependencies();

