import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: '../../apps/api/.env' });

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM',
    // AI_DECISION: Enable SSL for Fly.io PostgreSQL connections
    // Justificación: Fly.io usa SSL por defecto para PostgreSQL managed
    // Impacto: Conexiones seguras a la base de datos, previene warning de SSL en producción
    // Referencias: Fly.io PostgreSQL docs
    // Justificación: Railway usa SSL por defecto para PostgreSQL managed
    // Impacto: Conexiones seguras a la base de datos, previene warning de SSL en producción
    // Referencias: Railway PostgreSQL docs + migration plan from AWS RDS
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  tablesFilter: ['!pg_*', '!mv_*'],
  verbose: true,
  strict: true,
});
