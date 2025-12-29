import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Cargar .env
const rootDir = resolve(import.meta.dirname, '../..');
const envLocalPath = resolve(rootDir, '.env.local');
const envPath = resolve(rootDir, '.env');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });

const migrationsDir = resolve(import.meta.dirname, './migrations');

async function resetMigrations() {
  console.log('🗑️  Eliminando migraciones existentes...\n');

  // Eliminar todas las migraciones SQL
  if (existsSync(migrationsDir)) {
    try {
      // Eliminar todos los archivos .sql
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(migrationsDir);
      for (const file of files) {
        if (file.endsWith('.sql')) {
          await fs.unlink(resolve(migrationsDir, file));
        }
      }
      // Eliminar el directorio meta si existe
      const metaDir = resolve(migrationsDir, 'meta');
      if (existsSync(metaDir)) {
        rmSync(metaDir, { recursive: true, force: true });
      }
      // Recrear meta y journal vacío
      mkdirSync(metaDir, { recursive: true });
      writeFileSync(
        resolve(metaDir, '_journal.json'),
        JSON.stringify(
          {
            version: '7',
            dialect: 'postgresql',
            entries: [],
          },
          null,
          2
        )
      );
      console.log('✓ Directorio de migraciones limpiado');
    } catch (error) {
      console.error('⚠️  Error al limpiar:', error.message);
    }
  } else {
    mkdirSync(migrationsDir, { recursive: true });
    mkdirSync(resolve(migrationsDir, 'meta'), { recursive: true });
    writeFileSync(
      resolve(migrationsDir, 'meta', '_journal.json'),
      JSON.stringify(
        {
          version: '7',
          dialect: 'postgresql',
          entries: [],
        },
        null,
        2
      )
    );
  }

  console.log('\n🔄 Regenerando migraciones desde el schema actual...\n');

  try {
    // Generar nueva migración inicial desde el schema
    execSync('pnpm generate', {
      cwd: import.meta.dirname,
      stdio: 'inherit',
      env: process.env,
    });

    console.log('\n✅ Migraciones regeneradas exitosamente!\n');

    console.log('📝 Próximos pasos:');
    console.log('  1. Ejecutar: pnpm -F @maatwork/db db:reset');
    console.log('  2. Iniciar el servidor: pnpm dev');
    console.log('  3. El servidor aplicará automáticamente las migraciones limpias\n');
  } catch (error) {
    console.error('\n❌ Error al regenerar migraciones:', error.message);
    process.exit(1);
  }
}

resetMigrations();
