import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from 'drizzle-kit';

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
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/CRM'
  }
} satisfies Config;
