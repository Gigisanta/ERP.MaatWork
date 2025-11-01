/**
 * Configuración centralizada de la aplicación
 * AI_DECISION: Centralizar variables de entorno y fallbacks
 * Justificación: Evitar repetir process.env.NEXT_PUBLIC_API_URL 42 veces
 * Impacto: Single source of truth para configuración
 */

function getRequiredEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  // API Configuration
  apiUrl: getRequiredEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001'),
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature flags
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true'
  }
} as const;

export type Config = typeof config;

