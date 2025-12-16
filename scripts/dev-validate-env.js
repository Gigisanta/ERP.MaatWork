#!/usr/bin/env node

/**
 * Script de validación de variables de entorno
 * Verifica que los archivos .env existan y contengan valores críticos
 */

const fs = require('fs');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

let hasErrors = false;
let hasWarnings = false;

/**
 * Leer archivo .env y parsear variables
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Ignorar comentarios y líneas vacías
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remover comillas si existen
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

/**
 * Verificar archivo .env de API
 */
function checkApiEnv() {
  console.log(info('🔧 Verificando apps/api/.env...'));

  const envPath = path.join(projectRoot, 'apps', 'api', '.env');

  if (!fs.existsSync(envPath)) {
    console.log(error('  ❌ Archivo apps/api/.env no existe'));
    console.log(error('     Crea el archivo desde apps/api/.env.example'));
    hasErrors = true;
    return null;
  }

  const env = parseEnvFile(envPath);

  if (!env) {
    console.log(error('  ❌ No se pudo leer apps/api/.env'));
    hasErrors = true;
    return null;
  }

  console.log(success('  ✅ Archivo apps/api/.env existe'));

  // Verificar variables críticas
  const criticalVars = {
    DATABASE_URL: 'Cadena de conexión a PostgreSQL',
    JWT_SECRET: 'Secreto para firmar tokens JWT',
    PORT: 'Puerto del servidor (default: 3001)',
  };

  const missing = [];
  const warnings = [];

  for (const [key, description] of Object.entries(criticalVars)) {
    if (!env[key] || env[key].trim() === '') {
      if (key === 'PORT') {
        warnings.push({ key, description });
      } else {
        missing.push({ key, description });
      }
    } else {
      // Validaciones específicas
      if (key === 'DATABASE_URL') {
        if (!env[key].includes('postgresql://')) {
          console.log(warning(`  ⚠️  ${key} no parece ser una URL de PostgreSQL válida`));
          hasWarnings = true;
        } else {
          console.log(success(`  ✅ ${key} configurado`));
        }
      } else if (key === 'JWT_SECRET') {
        if (env[key] === 'change-me' || env[key].length < 16) {
          console.log(warning(`  ⚠️  ${key} debe ser más seguro (mínimo 16 caracteres)`));
          hasWarnings = true;
        } else {
          console.log(success(`  ✅ ${key} configurado`));
        }
      } else {
        console.log(success(`  ✅ ${key} configurado: ${env[key]}`));
      }
    }
  }

  if (missing.length > 0) {
    console.log(error('  ❌ Variables faltantes:'));
    missing.forEach(({ key, description }) => {
      console.log(error(`     - ${key}: ${description}`));
    });
    hasErrors = true;
  }

  if (warnings.length > 0) {
    warnings.forEach(({ key, description }) => {
      console.log(warning(`  ⚠️  ${key} no configurado (usará default: ${description})`));
    });
    hasWarnings = true;
  }

  return env;
}

/**
 * Verificar archivo .env de Web
 */
function checkWebEnv() {
  console.log(info('🌐 Verificando apps/web/.env.local...'));

  const envPath = path.join(projectRoot, 'apps', 'web', '.env.local');
  const envExamplePath = path.join(projectRoot, 'apps', 'web', '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log(warning('  ⚠️  Archivo apps/web/.env.local no existe'));
      console.log(warning('     Crea el archivo desde apps/web/.env.example'));
      console.log(warning('     O Next.js usará valores por defecto'));
    } else {
      console.log(warning('  ⚠️  Archivo apps/web/.env.local no existe (opcional)'));
    }
    hasWarnings = true;
    return null;
  }

  const env = parseEnvFile(envPath);

  if (!env) {
    console.log(warning('  ⚠️  No se pudo leer apps/web/.env.local'));
    hasWarnings = true;
    return null;
  }

  console.log(success('  ✅ Archivo apps/web/.env.local existe'));

  // Verificar variables importantes
  if (env.NEXT_PUBLIC_API_URL) {
    console.log(success(`  ✅ NEXT_PUBLIC_API_URL configurado: ${env.NEXT_PUBLIC_API_URL}`));
  } else {
    console.log(
      warning('  ⚠️  NEXT_PUBLIC_API_URL no configurado (default: http://localhost:3001)')
    );
    hasWarnings = true;
  }

  if (env.JWT_SECRET) {
    console.log(success('  ✅ JWT_SECRET configurado'));
  } else {
    console.log(
      warning('  ⚠️  JWT_SECRET no configurado (puede causar problemas de autenticación)')
    );
    hasWarnings = true;
  }

  return env;
}

/**
 * Verificar sincronización de JWT_SECRET entre API y Web
 */
function checkJwtSync(apiEnv, webEnv) {
  console.log(info('🔐 Verificando sincronización de JWT_SECRET...'));

  if (!apiEnv || !apiEnv.JWT_SECRET) {
    console.log(warning('  ⚠️  No se puede verificar (JWT_SECRET faltante en API)'));
    hasWarnings = true;
    return;
  }

  if (!webEnv || !webEnv.JWT_SECRET) {
    console.log(warning('  ⚠️  JWT_SECRET no configurado en Web (puede causar problemas)'));
    hasWarnings = true;
    return;
  }

  if (apiEnv.JWT_SECRET === webEnv.JWT_SECRET) {
    console.log(success('  ✅ JWT_SECRET sincronizado entre API y Web'));
  } else {
    console.log(error('  ❌ JWT_SECRET NO está sincronizado entre API y Web'));
    console.log(error('     Esto causará problemas de autenticación'));
    console.log(error('     Asegúrate de que ambos archivos tengan el mismo valor'));
    hasErrors = true;
  }
}

/**
 * Función principal
 */
function main() {
  console.log(chalk.bold.cyan('\n🔍 Validando variables de entorno...\n'));

  const apiEnv = checkApiEnv();
  console.log('');

  const webEnv = checkWebEnv();
  console.log('');

  checkJwtSync(apiEnv, webEnv);
  console.log('');

  if (hasErrors) {
    console.log(error('❌ Hay errores críticos que deben resolverse antes de continuar'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(warning('⚠️  Hay advertencias pero puedes continuar'));
    console.log(warning('   Algunas funcionalidades pueden no estar disponibles\n'));
    process.exit(0);
  } else {
    console.log(success('✅ Todas las variables de entorno están configuradas correctamente\n'));
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, checkApiEnv, checkWebEnv, checkJwtSync };
