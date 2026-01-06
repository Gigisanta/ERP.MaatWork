#!/usr/bin/env node

/**
 * Script de Setup Inicial
 *
 * Automatiza la configuración inicial del proyecto:
 * - Verifica prerequisitos
 * - Configura variables de entorno
 * - Inicia servicios Docker
 * - Ejecuta migraciones
 * - Crea usuario admin inicial
 * - Proporciona instrucciones claras
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const readline = require('readline');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;
const bold = chalk.bold;

// Importar funciones de verificación
const setupCheck = require('./setup-check');

/**
 * Crear interfaz readline para input del usuario
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Preguntar al usuario
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ejecutar comando y capturar output
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options,
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.message || String(err) };
  }
}

/**
 * Copiar archivo .env desde ejemplo
 */
function setupEnvFile() {
  console.log(info('\n🔧 Configurando variables de entorno...\n'));

  const envPath = path.join(projectRoot, 'apps', 'api', '.env');
  const envExamplePath = path.join(projectRoot, 'apps', 'api', 'config-example.env');

  if (fs.existsSync(envPath)) {
    console.log(success('  ✅ Archivo apps/api/.env ya existe'));
    return { success: true, created: false };
  }

  if (!fs.existsSync(envExamplePath)) {
    console.log(error('  ❌ Archivo config-example.env no encontrado'));
    return { success: false, created: false };
  }

  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log(success('  ✅ Archivo apps/api/.env creado desde config-example.env'));
    console.log(warning('  ⚠️  Revisa y ajusta las variables según tu entorno'));
    return { success: true, created: true };
  } catch (err) {
    console.log(error(`  ❌ Error al crear .env: ${err.message}`));
    return { success: false, created: false };
  }
}

/**
 * Iniciar servicios Docker
 */
async function startDockerServices() {
  console.log(info('\n🐳 Iniciando servicios Docker...\n'));

  // Verificar si PostgreSQL ya está corriendo
  const dockerResult = execCommand('docker ps --format "{{.Names}}" | grep -i postgres');
  if (dockerResult.success && dockerResult.output) {
    console.log(success('  ✅ PostgreSQL ya está corriendo'));
    return { success: true, started: false };
  }

  // Verificar docker-compose
  const dockerComposeResult = execCommand(
    'docker compose version 2>/dev/null || docker-compose version 2>/dev/null'
  );
  if (!dockerComposeResult.success) {
    console.log(error('  ❌ Docker Compose no está disponible'));
    return { success: false, started: false };
  }

  // Iniciar servicios
  try {
    console.log(info('  Iniciando PostgreSQL y N8N...'));
    execSync('docker compose up -d', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    // Esperar un poco para que los servicios inicien
    console.log(info('  Esperando que los servicios inicien...'));
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log(success('  ✅ Servicios Docker iniciados'));
    return { success: true, started: true };
  } catch (err) {
    console.log(error(`  ❌ Error al iniciar servicios: ${err.message}`));
    return { success: false, started: false };
  }
}

/**
 * Ejecutar migraciones de base de datos
 */
async function runMigrations() {
  console.log(info('\n🗄️  Ejecutando migraciones de base de datos...\n'));

  try {
    execSync('pnpm -F @maatwork/db migrate', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log(success('  ✅ Migraciones ejecutadas exitosamente'));
    return { success: true };
  } catch (err) {
    console.log(error(`  ❌ Error al ejecutar migraciones: ${err.message}`));
    return { success: false };
  }
}

/**
 * Crear usuario admin inicial
 */
async function createInitialAdmin() {
  console.log(info('\n👤 Creando usuario admin inicial...\n'));

  try {
    // Usar el script existente de la API que ya funciona correctamente
    // Primero intentar crear el usuario admin@maatwork.local
    execSync(
      "pnpm -F @maatwork/api exec tsx -e \"import { db, users } from '@maatwork/db'; import { eq } from 'drizzle-orm'; (async () => { const email = 'admin@maatwork.local'; const existing = await db().query.users.findMany({ where: eq(users.email, email), limit: 1 }); if (existing.length > 0) { console.log('✅ Usuario admin ya existe:', email); process.exit(0); } const admins = await db().select().from(users).where(eq(users.role, 'admin')).limit(1); if (admins.length > 0) { console.log('✅ Ya existe un usuario admin en la base de datos'); process.exit(0); } const [newUser] = await db().insert(users).values({ email, fullName: 'Admin Usuario', role: 'admin', isActive: true, username: email.split('@')[0], usernameNormalized: email.split('@')[0].toLowerCase() }).returning(); console.log('✅ Usuario admin creado:', newUser.email); process.exit(0); })().catch(err => { console.error('Error:', err.message); process.exit(1); });\"",
      {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' },
      }
    );
    console.log(success('  ✅ Usuario admin verificado/creado'));
    return { success: true };
  } catch (err) {
    // Si falla, intentar con el script existente add-user.ts modificado
    try {
      console.log(info('  Intentando método alternativo...'));
      // Crear un script temporal que funcione
      const tempScript = `
import { db, users } from '@maatwork/db';
import { eq } from 'drizzle-orm';

(async () => {
  const email = 'admin@maatwork.local';
  const existing = await db().query.users.findMany({ where: eq(users.email, email), limit: 1 });
  if (existing.length > 0) {
    console.log('✅ Usuario admin ya existe:', email);
    process.exit(0);
  }
  const admins = await db().select().from(users).where(eq(users.role, 'admin')).limit(1);
  if (admins.length > 0) {
    console.log('✅ Ya existe un usuario admin');
    process.exit(0);
  }
  const [newUser] = await db().insert(users).values({
    email,
    fullName: 'Admin Usuario',
    role: 'admin',
    isActive: true,
    username: email.split('@')[0],
    usernameNormalized: email.split('@')[0].toLowerCase()
  }).returning();
  console.log('✅ Usuario admin creado:', newUser.email);
  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
`;
      const tempPath = path.join(projectRoot, 'apps', 'api', 'src', 'create-admin-temp.ts');
      fs.writeFileSync(tempPath, tempScript);
      execSync('pnpm -F @maatwork/api exec tsx src/create-admin-temp.ts', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      fs.unlinkSync(tempPath);
      console.log(success('  ✅ Usuario admin verificado/creado'));
      return { success: true };
    } catch (err2) {
      console.log(warning(`  ⚠️  No se pudo crear usuario admin automáticamente`));
      console.log(warning('     Puedes crearlo manualmente después con:'));
      console.log(warning('     pnpm -F @maatwork/api run add-user'));
      console.log(warning('     O edita apps/api/src/add-user.ts y ejecútalo'));
      return { success: false };
    }
  }
}

/**
 * Mostrar instrucciones finales
 */
function showFinalInstructions() {
  console.log(bold.cyan('\n' + '='.repeat(60)));
  console.log(bold.cyan('✅ Setup completado exitosamente!'));
  console.log(bold.cyan('='.repeat(60) + '\n'));

  console.log(info('📝 Próximos pasos:\n'));
  console.log('  1. Inicia el servidor de desarrollo:');
  console.log(bold('     pnpm dev\n'));
  console.log('  2. Abre tu navegador en:');
  console.log(bold('     http://localhost:3000\n'));
  console.log('  3. Haz login con el usuario admin:');
  console.log(bold('     Email: admin@maatwork.local\n'));
  console.log('  4. Si tienes problemas de autenticación:');
  console.log('     - Limpia las cookies del navegador para localhost');
  console.log('     - O usa modo incógnito\n');
  console.log(warning('⚠️  Nota: Si encuentras tokens viejos o errores 401:'));
  console.log('     - Abre DevTools (F12) → Application → Cookies');
  console.log('     - Elimina todas las cookies de localhost');
  console.log('     - Recarga la página\n');
}

/**
 * Función principal
 */
async function main() {
  console.log(bold.cyan('\n' + '='.repeat(60)));
  console.log(bold.cyan('🌵 MAATWORK - Setup Inicial'));
  console.log(bold.cyan('='.repeat(60) + '\n'));

  // 1. Verificar prerequisitos
  console.log(bold('Paso 1/5: Verificando prerequisitos...\n'));

  // Ejecutar verificaciones individuales
  const checkNode = setupCheck.checkNodeVersion();
  const checkPnpm = setupCheck.checkPnpm();
  const checkDocker = setupCheck.checkDocker();
  const checkPostgres = setupCheck.checkPostgreSQL();
  const envCheck = setupCheck.checkEnvFile();

  console.log('');

  // Si hay errores críticos, salir
  if (!checkNode || !checkPnpm || !checkDocker) {
    console.log(error('❌ Hay errores críticos en los prerequisitos'));
    console.log(error('   Por favor corrige los errores y ejecuta el setup nuevamente\n'));
    process.exit(1);
  }

  if (checkPostgres === false && checkDocker) {
    console.log(info('   PostgreSQL no está corriendo, el setup lo iniciará automáticamente\n'));
  }

  // 2. Configurar archivo .env
  console.log(bold('\nPaso 2/5: Configurando variables de entorno...\n'));
  const envResult = setupEnvFile();
  if (!envResult.success) {
    console.log(error('\n❌ Error al configurar variables de entorno'));
    process.exit(1);
  }

  // 3. Iniciar servicios Docker
  console.log(bold('\nPaso 3/5: Iniciando servicios Docker...\n'));
  const dockerResult = await startDockerServices();
  if (!dockerResult.success) {
    console.log(warning('\n⚠️  No se pudieron iniciar servicios Docker automáticamente'));
    console.log(warning('   Puedes iniciarlos manualmente con: docker compose up -d\n'));
  }

  // 4. Ejecutar migraciones
  console.log(bold('\nPaso 4/5: Ejecutando migraciones...\n'));
  const migrationResult = await runMigrations();
  if (!migrationResult.success) {
    console.log(error('\n❌ Error al ejecutar migraciones'));
    console.log(
      error('   Verifica que PostgreSQL esté corriendo y que DATABASE_URL sea correcta\n')
    );
    process.exit(1);
  }

  // 5. Crear usuario admin
  console.log(bold('\nPaso 5/5: Creando usuario admin inicial...\n'));
  await createInitialAdmin();

  // Mostrar instrucciones finales
  showFinalInstructions();

  process.exit(0);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((err) => {
    console.error(error('\n❌ Error fatal durante el setup:'));
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
