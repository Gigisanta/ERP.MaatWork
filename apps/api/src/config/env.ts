/**
 * Carga las variables de entorno del archivo .env
 * Este archivo DEBE ser importado PRIMERO antes que cualquier otro módulo
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Cargar .env desde el directorio de la API
const envPath = resolve(process.cwd(), '.env');

console.log(`Looking for .env at: ${envPath}`);
console.log(`Exists: ${existsSync(envPath)}`);

const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env file from ${envPath}`);
  console.warn(`Error: ${result.error.message}`);
}

// Debug: mostrar variables cargadas
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('PORT loaded:', process.env.PORT);

// Validar variables requeridas
const required = ['DATABASE_URL', 'PORT'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  // No lanzar error por ahora para debugging
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
  CSP_ENABLED: process.env.CSP_ENABLED === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

