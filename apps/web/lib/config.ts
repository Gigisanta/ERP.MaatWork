/**
 * Configuración centralizada de la aplicación
 * AI_DECISION: Centralizar variables de entorno y fallbacks
 * Justificación: Evitar repetir process.env.NEXT_PUBLIC_API_URL 42 veces
 * Impacto: Single source of truth para configuración
 *
 * IMPORTANTE: Next.js solo reemplaza process.env.NEXT_PUBLIC_* cuando se accede
 * DIRECTAMENTE (ej: process.env.NEXT_PUBLIC_API_URL), no a través de funciones
 * o acceso dinámico (ej: process.env[key]). Por eso usamos acceso directo aquí.
 */

export const config = {
  // API Configuration - Acceso DIRECTO para que Next.js haga el reemplazo en build time
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),

  // Google OAuth Configuration
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',

  // Environment
  environment: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Feature flags
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  },
} as const;

type Config = typeof config;
