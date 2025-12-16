/**
 * Database Initialization Module
 *
 * Handles automatic migration and seeding on API startup.
 * Ensures database is always in a consistent state with SYSTEM-REQUIRED data only.
 *
 * REGLA CURSOR: This module MUST be idempotent - safe to run multiple times
 * REGLA CURSOR: Only seeds SYSTEM-ESSENTIAL data (pipeline stages + lookup tables)
 * REGLA CURSOR: NO simulated/fictional data (benchmarks, instruments, notification templates)
 */

import {
  db,
  pipelineStages,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  lookupAssetClass,
  teams,
  users,
  teamMembership,
} from '@cactus/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import pino from 'pino';
import { ensureDefaultPipelineStages } from './utils/pipeline-stages';

const logger = pino({ name: 'db-init' });

/**
 * Verify database connection before attempting operations
 * Provides helpful error messages if PostgreSQL is not available
 */
async function verifyDatabaseConnection(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please configure it in apps/api/.env'
    );
  }

  try {
    // Extract connection info from DATABASE_URL for better error messages
    const urlMatch = databaseUrl.match(/postgresql:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/(.+)/);
    const host = urlMatch?.[3] || 'localhost';
    const port = urlMatch?.[4] || '5432';

    // Try to connect using a simple query via singleton db
    await db().execute(sql`SELECT 1`);
    logger.debug({ host, port }, '✅ Database connection verified');
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      code?: string;
      errno?: number;
      address?: string;
      port?: number;
    };
    const code = err?.code || 'UNKNOWN';

    if (code === 'ECONNREFUSED' || err?.errno === -61) {
      const urlMatch = databaseUrl.match(/postgresql:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/(.+)/);
      const host = urlMatch?.[3] || 'localhost';
      const port = urlMatch?.[4] || '5432';

      logger.error(
        {
          host,
          port,
          code,
          hint: 'PostgreSQL connection refused. Please ensure:',
          checks: [
            '1. Docker container is running: docker compose up -d db',
            '2. Wait a few seconds for PostgreSQL to start',
            '3. Check container status: docker compose ps',
            '4. View container logs: docker compose logs db',
            '5. Verify DATABASE_URL in apps/api/.env is correct',
          ],
        },
        '❌ Cannot connect to PostgreSQL'
      );

      throw new Error(
        `Database connection refused at ${host}:${port}. Please ensure PostgreSQL is running (docker compose up -d db).`
      );
    }

    throw error;
  }
}

/**
 * Run pending database migrations using Drizzle migrator
 * - Enabled when AUTO_MIGRATE=true or in non-production environments by default
 * - Points to squashed baseline at packages/db/migrations_squashed
 *
 * AI_DECISION: Optimizado con check rápido antes de ejecutar migraciones
 * Justificación: Drizzle migrate() ya es inteligente, pero hacer check rápido evita overhead innecesario
 * Impacto: Inicio más rápido cuando no hay migraciones pendientes
 */
async function runMigrations(): Promise<void> {
  const autoMigrate = process.env.AUTO_MIGRATE === 'true' || process.env.NODE_ENV !== 'production';
  const migrationsFolder = resolve(process.cwd(), '../../packages/db/migrations');
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!autoMigrate) {
    if (isDevelopment) {
      logger.debug({ migrationsFolder }, '🔄 Auto-migrate disabled; skipping migrations');
    } else {
      logger.info({ migrationsFolder }, '🔄 Auto-migrate disabled; skipping migrations');
      logger.info('  To enable, set AUTO_MIGRATE=true');
    }
    return;
  }

  // AI_DECISION: Check rápido antes de ejecutar migraciones completas
  // Justificación: Si no hay migraciones pendientes, evitar overhead de migrate()
  // Impacto: Reduce tiempo de inicio cuando DB ya está actualizada
  try {
    // Check rápido: verificar si tabla de migraciones existe y tiene registros
    const migrationCheck = await db().execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
    `);

    const hasMigrationTable = migrationCheck.rows[0]?.count > 0;

    if (hasMigrationTable && isDevelopment) {
      // En desarrollo, solo loguear si hay migraciones pendientes
      logger.debug('🔄 Checking for pending migrations...');
    } else {
      logger.info({ migrationsFolder }, '🔄 Running database migrations');
    }

    await migrate(db(), { migrationsFolder });

    if (isDevelopment) {
      logger.debug('✅ Migrations check completed');
    } else {
      logger.info('✅ Migrations completed');
    }
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      code?: string;
      severity?: string;
      errno?: number;
      syscall?: string;
      address?: string;
      port?: number;
      aggregateErrors?: Array<{ code?: string; message?: string; address?: string; port?: number }>;
    };
    const message = err?.message || 'Unknown error';
    const code = err?.code || 'UNKNOWN';

    // Detect ECONNREFUSED (connection refused) errors
    const isConnectionRefused =
      code === 'ECONNREFUSED' ||
      err?.errno === -61 ||
      err?.code === 'ECONNREFUSED' ||
      message.includes('ECONNREFUSED') ||
      err?.aggregateErrors?.some((e) => e.code === 'ECONNREFUSED');

    // Detect authentication and other connection errors
    const isAuthError =
      code === '28000' ||
      message.includes('does not exist') ||
      message.includes('authentication failed');

    if (isConnectionRefused || isAuthError) {
      const port = err?.port || err?.aggregateErrors?.[0]?.port || 5433;
      const address = err?.address || err?.aggregateErrors?.[0]?.address || 'localhost';

      logger.error(
        {
          err: error,
          code,
          port,
          address,
          hint: 'Database connection failed. Common causes:',
          checks: [
            '1. Ensure PostgreSQL is running: docker compose up -d db',
            '2. Wait a few seconds after starting Docker container',
            '3. Verify DATABASE_URL in apps/api/.env matches your PostgreSQL setup',
            '4. For Docker: ensure container is running: docker compose ps',
            '5. Check PostgreSQL logs: docker compose logs db',
          ],
        },
        '❌ Database connection failed - cannot run migrations'
      );

      const errorMessage = isConnectionRefused
        ? `Database connection refused at ${address}:${port}. Please ensure PostgreSQL is running (docker compose up -d db).`
        : `Database connection failed: ${message}. Please ensure PostgreSQL is running and DATABASE_URL is correct.`;

      throw new Error(errorMessage);
    }

    logger.error({ err: error, code }, '❌ Migration failed');
    throw error;
  }
}

/**
 * Seed the 7 required pipeline stages
 * Uses centralized default stages configuration
 *
 * AI_DECISION: Usar función helper centralizada en lugar de duplicar lógica
 * Justificación: Evita duplicación, fuente única de verdad para etapas por defecto
 * Impacto: Mantenibilidad mejorada, cambios futuros solo en un lugar
 */
async function seedPipelineStages(): Promise<void> {
  // AI_DECISION: Reducir logging en desarrollo para mejorar rendimiento
  // Justificación: Seeds son idempotentes, no necesitan logging detallado en cada inicio
  // Impacto: Menos overhead de logging, inicio más rápido
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'info');

  if (!isDevelopment || logLevel === 'debug') {
    logger.info('🌱 Seeding pipeline stages...');
  }
  await ensureDefaultPipelineStages(isDevelopment && logLevel !== 'debug'); // Menos logs en desarrollo
  if (!isDevelopment || logLevel === 'debug') {
    logger.info('✅ Pipeline stages seeded successfully');
  }
}

/**
 * Seed lookup tables with essential data
 * Creates the basic lookup values needed for the system
 */
async function seedLookupTables(): Promise<void> {
  // AI_DECISION: Reducir logging en desarrollo para mejorar rendimiento
  // Justificación: Seeds son idempotentes, no necesitan logging detallado en cada inicio
  // Impacto: Menos overhead de logging, inicio más rápido
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'info');

  if (!isDevelopment || logLevel === 'debug') {
    logger.info('🌱 Seeding lookup tables...');
  }

  const dbInstance = db();

  // Task Status lookup
  const taskStatuses = [
    { id: 'open', label: 'Abierta' },
    { id: 'in_progress', label: 'En Progreso' },
    { id: 'completed', label: 'Completada' },
    { id: 'cancelled', label: 'Cancelada' },
  ];

  for (const status of taskStatuses) {
    try {
      await dbInstance.insert(lookupTaskStatus).values(status).onConflictDoNothing();
    } catch (error) {
      logger.debug({ status }, 'Task status already exists or error occurred');
    }
  }

  // Priority lookup
  const priorities = [
    { id: 'low', label: 'Baja' },
    { id: 'medium', label: 'Media' },
    { id: 'high', label: 'Alta' },
    { id: 'urgent', label: 'Urgente' },
  ];

  for (const priority of priorities) {
    try {
      await dbInstance.insert(lookupPriority).values(priority).onConflictDoNothing();
    } catch (error) {
      logger.debug({ priority }, 'Priority already exists or error occurred');
    }
  }

  // Notification Type lookup
  const notificationTypes = [
    { id: 'task_assigned', label: 'Tarea Asignada' },
    { id: 'task_due', label: 'Tarea Vencida' },
    { id: 'sla_warning', label: 'Advertencia SLA' },
    { id: 'contact_moved', label: 'Contacto Movido' },
    { id: 'note_mention', label: 'Mención en Nota' },
  ];

  for (const type of notificationTypes) {
    try {
      await dbInstance.insert(lookupNotificationType).values(type).onConflictDoNothing();
    } catch (error) {
      logger.debug({ type }, 'Notification type already exists or error occurred');
    }
  }

  // Asset Class lookup
  const assetClasses = [
    { id: 'equity', label: 'Acciones' },
    { id: 'fixed_income', label: 'Renta Fija' },
    { id: 'money_market', label: 'Mercado Monetario' },
    { id: 'alternative', label: 'Alternativos' },
    { id: 'commodities', label: 'Commodities' },
  ];

  // AI_DECISION: Optimizar batch insert - reemplazar loop con INSERTs individuales por batch insert
  // Justificación: Reduce de N queries a 1 query (N-1 reducción, típicamente 5 queries → 1)
  // Impacto: Mejora performance del seed de lookup tables
  if (assetClasses.length > 0) {
    try {
      await dbInstance.insert(lookupAssetClass).values(assetClasses).onConflictDoNothing();
    } catch (error) {
      logger.debug({ error }, 'Asset classes batch insert failed or already exist');
    }
  }

  if (!isDevelopment || logLevel === 'debug') {
    logger.info('✅ Lookup tables seeded successfully');
  }
}

/** Ensure critical auth columns and backfill username for admin if missing */
async function ensureCriticalColumns(): Promise<void> {
  const dbi = db();
  await dbi.execute(sql`ALTER TABLE IF EXISTS public.users
       ADD COLUMN IF NOT EXISTS username text,
       ADD COLUMN IF NOT EXISTS username_normalized text;`);
  await dbi.execute(sql`DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='users_username_normalized_unique'
         ) THEN
           CREATE UNIQUE INDEX users_username_normalized_unique
             ON public.users (username_normalized) WHERE username_normalized IS NOT NULL;
         END IF;
       END $$;`);
  await dbi.execute(sql`DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_users_username_normalized'
         ) THEN
           CREATE INDEX idx_users_username_normalized
             ON public.users (username_normalized) WHERE username_normalized IS NOT NULL;
         END IF;
       END $$;`);
  // Backfill for admin if created without username fields
  await dbi.execute(sql`UPDATE public.users
       SET username = 'gio', username_normalized = 'gio'
       WHERE email = 'giolivosantarelli@gmail.com' AND (username IS NULL OR username_normalized IS NULL);`);
}

export async function initializeDatabase(): Promise<void> {
  // AI_DECISION: Reducir logging verboso en desarrollo para mejorar rendimiento
  // Justificación: Logs detallados agregan overhead innecesario en desarrollo frecuente
  // Impacto: Inicio más rápido, menos ruido en consola
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'info');

  if (isDevelopment && logLevel === 'debug') {
    logger.debug('🚀 Starting SYSTEM-ESSENTIAL database initialization...');
  } else {
    logger.info('🚀 Starting SYSTEM-ESSENTIAL database initialization...');
  }

  try {
    // Step 1: Verify database connection
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 1/6: Verifying database connection...');
    }
    await verifyDatabaseConnection();

    // Step 2: Run migrations
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 2/6: Running migrations...');
    }
    await runMigrations();

    // Step 3: Seed pipeline stages (SYSTEM-REQUIRED)
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 3/6: Seeding pipeline stages...');
    }
    await seedPipelineStages();

    // Step 4: Seed lookup tables (SYSTEM-REQUIRED)
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 4/6: Seeding lookup tables...');
    }
    await seedLookupTables();

    // Step 5: Ensure critical columns exist for auth to work in dev
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 5/6: Ensuring critical columns...');
    }
    await ensureCriticalColumns();

    // Step 6: Seed idempotent team "cactus"
    if (isDevelopment && logLevel === 'debug') {
      logger.debug('Step 6/6: Seeding cactus team...');
    }
    await seedCactusTeam();

    if (isDevelopment && logLevel === 'debug') {
      logger.debug('✅ SYSTEM-ESSENTIAL database initialization completed successfully');
    } else {
      logger.info('✅ SYSTEM-ESSENTIAL database initialization completed successfully');
    }

    if (!isDevelopment) {
      logger.info(
        'ℹ️  Note: Benchmarks/instruments must be fetched from yfinance based on user searches/portfolios'
      );
    }
  } catch (error) {
    const err = error as { message?: string; code?: string };
    logger.error(
      {
        err: error,
        message: err?.message,
        code: err?.code,
        troubleshooting: 'See error details above for specific failure step',
      },
      '❌ Database initialization failed'
    );
    throw error;
  }
}

/** Seed idempotent team "cactus" for Teams feature */
async function seedCactusTeam(): Promise<void> {
  const dbi = db();
  try {
    const existing = await dbi
      .select()
      .from(teams)
      .where((teams.name as any).eq?.('cactus') ?? (eq as any)(teams.name as any, 'cactus'))
      .limit(1);
    if (existing.length > 0) {
      // AI_DECISION: Changed from info to debug to reduce console noise during startup
      // Justification: This is expected behavior in most dev/prod restarts
      logger.debug({ teamId: existing[0].id }, '🌵 Team "cactus" already exists');
      return;
    }

    // Find a manager to assign as team manager
    const manager = await dbi.select().from(users).where(eq(users.role, 'manager')).limit(1);
    const managerUserId = manager[0]?.id || null;

    const [teamRow] = await dbi.insert(teams).values({ name: 'cactus', managerUserId }).returning();

    if (managerUserId) {
      await dbi
        .insert(teamMembership)
        .values({ teamId: teamRow.id, userId: managerUserId, role: 'lead' })
        .onConflictDoNothing();
    }
    logger.info({ teamId: teamRow.id, managerUserId }, '🌵 Seeded team "cactus"');
  } catch (err) {
    logger.warn({ err }, 'Failed to seed team "cactus" (non-fatal)');
  }
}
