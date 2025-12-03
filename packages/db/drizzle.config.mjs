import { defineConfig } from 'drizzle-kit';

/**
 * Configuración de Drizzle Kit.
 * 
 * NOTA: DATABASE_URL debe ser configurada como variable de entorno antes de ejecutar.
 * En producción MVP: source infrastructure/mvp/.env antes de ejecutar migraciones.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM'
  }
});
