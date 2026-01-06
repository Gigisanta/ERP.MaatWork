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
  // AI_DECISION: Usar console.warn en lugar de logger
  // Justificación: Este archivo se carga antes de que el logger esté disponible
  // Impacto: Logging apropiado durante inicialización sin dependencias circulares
  console.warn(`Warning: Could not load .env file from ${envPath}: ${result.error.message}`);
}

// Validar variables requeridas
const required = ['DATABASE_URL', 'PORT'];
// AI_DECISION: Agregar CORS_ORIGINS, FRONTEND_URL, COOKIE_DOMAIN como requeridas en producción
// Justificación: Estas variables son críticas para que la app funcione correctamente con Cloudflare
// Impacto: Deploy falla temprano si faltan variables, evitando errores difíciles de diagnosticar
const requiredInProduction = [
  'JWT_SECRET',
  'CORS_ORIGINS', // Necesario para permitir requests del frontend
  'FRONTEND_URL', // Necesario para redirects de OAuth
  'COOKIE_DOMAIN', // Necesario para que cookies funcionen con Cloudflare
];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error(message);
  } else {
    // AI_DECISION: Usar console.warn en lugar de logger
    // Justificación: Este archivo se carga antes de que el logger esté disponible
    // Impacto: Logging apropiado durante inicialización sin dependencias circulares
    console.warn(message);
  }
}

if ((process.env.NODE_ENV || 'development') === 'production') {
  const missingProd = requiredInProduction.filter((key) => !process.env[key]);
  if (missingProd.length > 0) {
    throw new Error(`Missing required production env vars: ${missingProd.join(', ')}`);
  }

  // Validar formato de CORS_ORIGINS (debe ser URLs separadas por coma)
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins && !corsOrigins.startsWith('http')) {
    console.warn(
      'Warning: CORS_ORIGINS should be comma-separated URLs (e.g., https://maat.work,https://www.maat.work)'
    );
  }

  // Validar que FRONTEND_URL sea HTTPS en producción
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !frontendUrl.startsWith('https://')) {
    console.warn('Warning: FRONTEND_URL should use HTTPS in production');
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
  // Cookie Configuration
  // AI_DECISION: Exponer COOKIE_DOMAIN para uso en cookie-config.ts
  // Justificación: Necesario para que cookies funcionen correctamente con Cloudflare/subdominios
  // Impacto: Cookies se establecen con domain correcto (.maat.work) en producción
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '', // e.g., '.maat.work' para producción
  // Google OAuth2 Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/v1/auth/google/callback',
  GOOGLE_ENCRYPTION_KEY: process.env.GOOGLE_ENCRYPTION_KEY || '', // 32 bytes para AES-256
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  // N8N Configuration
  N8N_ENABLED: process.env.N8N_ENABLED !== 'false', // Default to true unless explicitly disabled
  N8N_WEBHOOK_RATE_LIMIT: parseInt(process.env.N8N_WEBHOOK_RATE_LIMIT || '60', 10),
  N8N_WEBHOOK_BATCH_SIZE: parseInt(process.env.N8N_WEBHOOK_BATCH_SIZE || '100', 10),
  N8N_WEBHOOK_TIMEOUT: parseInt(process.env.N8N_WEBHOOK_TIMEOUT || '30000', 10),
};
