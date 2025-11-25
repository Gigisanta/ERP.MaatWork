import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Config } from 'drizzle-kit';

// Obtener __dirname equivalente para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Buscar .env en la raíz del monorepo (2 niveles arriba de packages/db)
const rootDir = resolve(__dirname, '../..');
const envLocalPath = resolve(rootDir, '.env.local');
const envPath = resolve(rootDir, '.env');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });

/**
 * Configuración de Drizzle Kit.
 * - schema: ruta al archivo TypeScript con tablas y relaciones.
 * - out: directorio de salida para migraciones generadas automáticamente.
 * - dialect: base de datos objetivo (PostgreSQL).
 * - dbCredentials.url: cadena de conexión usada por generate/push.
 */
export default {
  schema: './src/schema.ts',
  // Use canonical migrations directory (with meta/_journal.json)
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM'
  }
} satisfies Config;
