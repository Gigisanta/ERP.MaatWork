import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from 'drizzle-kit';

const cwd = process.cwd();
const envLocalPath = resolve(cwd, '.env.local');
const envPath = resolve(cwd, '.env');
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
    url: process.env.DATABASE_URL!
  }
} satisfies Config;


