/**
 * Carga las variables de entorno del archivo .env
 * Este archivo DEBE ser importado PRIMERO antes que cualquier otro módulo
 * REGLA CURSOR: No modificar validación de env vars sin actualizar sistema de errores
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Cargar .env desde el directorio de la API
const envPath = resolve(process.cwd(), '.env');

const result = config({ path: envPath });

if (result.error && existsSync(envPath)) {
  // Si existe el archivo pero falló la carga, advertir
  console.warn(`Warning: Could not load .env file from ${envPath}: ${result.error.message}`);
}

// Validar variables requeridas
const required = ['DATABASE_URL', 'PORT'];
const requiredInProduction = ['JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

if ((process.env.NODE_ENV || 'development') === 'production') {
  const missingProd = requiredInProduction.filter(key => !process.env[key]);
  if (missingProd.length > 0) {
    throw new Error(`Missing required production env vars: ${missingProd.join(', ')}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
  CSP_ENABLED: process.env.CSP_ENABLED === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // N8N Webhook Configuration
  N8N_ENABLED: process.env.N8N_ENABLED !== 'false',
  N8N_WEBHOOK_BATCH_SIZE: parseInt(process.env.N8N_WEBHOOK_BATCH_SIZE || '100', 10),
  N8N_WEBHOOK_RATE_LIMIT: parseInt(process.env.N8N_WEBHOOK_RATE_LIMIT || '10', 10),
  N8N_WEBHOOK_TIMEOUT: parseInt(process.env.N8N_WEBHOOK_TIMEOUT || '30000', 10)
};

