import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Obtener __dirname equivalente para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Buscar .env en múltiples ubicaciones (en orden de prioridad):
// 1. .env.local en la raíz del monorepo (desarrollo local)
// 2. .env en la raíz del monorepo (desarrollo local)
// 3. infrastructure/mvp/.env (producción MVP)
const rootDir = resolve(__dirname, '../..');
const envPaths = [
  resolve(rootDir, '.env.local'),
  resolve(rootDir, '.env'),
  resolve(rootDir, 'infrastructure/mvp/.env'),
];

const envPath = envPaths.find(p => existsSync(p));
if (envPath) {
  config({ path: envPath });
}

/**
 * Configuración de Drizzle Kit.
 * - schema: ruta al archivo TypeScript con tablas y relaciones.
 * - out: directorio de salida para migraciones generadas automáticamente.
 * - dialect: base de datos objetivo (PostgreSQL).
 * - dbCredentials.url: cadena de conexión usada por generate/push.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM'
  }
});

