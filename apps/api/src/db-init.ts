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

import { Pool } from 'pg';
import { db, pipelineStages, lookupTaskStatus, lookupPriority, lookupNotificationType, lookupAssetClass, teams, users, teamMembership } from '@cactus/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'db-init' });

/**
 * Run pending database migrations using Drizzle migrator
 * - Enabled when AUTO_MIGRATE=true or in non-production environments by default
 * - Points to squashed baseline at packages/db/migrations_squashed
 */
async function runMigrations(): Promise<void> {
  const autoMigrate = process.env.AUTO_MIGRATE === 'true' || (process.env.NODE_ENV !== 'production');
  const migrationsFolder = resolve(process.cwd(), '../../packages/db/migrations');

  if (!autoMigrate) {
    logger.info({ migrationsFolder }, '🔄 Auto-migrate disabled; skipping migrations');
    logger.info('  To enable, set AUTO_MIGRATE=true');
    return;
  }

  logger.info({ migrationsFolder }, '🔄 Running database migrations');
  await migrate(db(), { migrationsFolder });
  logger.info('✅ Migrations completed');
}

/**
 * Seed the 7 required pipeline stages
 * Uses upsert logic to avoid duplicates
 */
async function seedPipelineStages(): Promise<void> {
  logger.info('🌱 Seeding pipeline stages...');
  
  const stages = [
    {
      name: 'Prospecto',
      description: 'Contacto inicial identificado',
      order: 1,
      color: '#3b82f6', // Azul
      wipLimit: null
    },
    {
      name: 'Contactado',
      description: 'Primer contacto realizado',
      order: 2,
      color: '#8b5cf6', // Morado
      wipLimit: null
    },
    {
      name: 'Primera reunion',
      description: 'Primera reunión agendada o realizada',
      order: 3,
      color: '#f59e0b', // Amarillo/Naranja
      wipLimit: null
    },
    {
      name: 'Segunda reunion',
      description: 'Segunda reunión agendada o realizada',
      order: 4,
      color: '#f97316', // Naranja
      wipLimit: null
    },
    {
      name: 'Cliente',
      description: 'Cliente activo',
      order: 5,
      color: '#10b981', // Verde
      wipLimit: null
    },
    {
      name: 'Cuenta vacia',
      description: 'Cliente sin saldo',
      order: 6,
      color: '#6b7280', // Gris
      wipLimit: null
    },
    {
      name: 'Caido',
      description: 'Cliente perdido o inactivo',
      order: 7,
      color: '#ef4444', // Rojo
      wipLimit: null
    }
  ];

  const dbInstance = db();
  
  for (const stage of stages) {
    try {
      // Check if stage exists by name
      const existing = await dbInstance
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.name, stage.name))
        .limit(1);

      if (existing.length > 0) {
        // Update existing stage
        await dbInstance
          .update(pipelineStages)
          .set({
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(pipelineStages.id, existing[0].id));

        logger.debug(`Updated pipeline stage: ${stage.name}`);
      } else {
        // Create new stage
        await dbInstance
          .insert(pipelineStages)
          .values({
            name: stage.name,
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true
          });

        logger.debug(`Created pipeline stage: ${stage.name}`);
      }
    } catch (error) {
      logger.error({ err: error, stage: stage.name }, `Error processing pipeline stage: ${stage.name}`);
      throw error;
    }
  }
  
  logger.info('✅ Pipeline stages seeded successfully');
}

/**
 * Seed lookup tables with essential data
 * Creates the basic lookup values needed for the system
 */
async function seedLookupTables(): Promise<void> {
  logger.info('🌱 Seeding lookup tables...');
  
  const dbInstance = db();
  
  // Task Status lookup
  const taskStatuses = [
    { id: 'open', label: 'Abierta' },
    { id: 'in_progress', label: 'En Progreso' },
    { id: 'completed', label: 'Completada' },
    { id: 'cancelled', label: 'Cancelada' }
  ];
  
  for (const status of taskStatuses) {
    try {
      await dbInstance
        .insert(lookupTaskStatus)
        .values(status)
        .onConflictDoNothing();
    } catch (error) {
      logger.debug({ status }, 'Task status already exists or error occurred');
    }
  }
  
  // Priority lookup
  const priorities = [
    { id: 'low', label: 'Baja' },
    { id: 'medium', label: 'Media' },
    { id: 'high', label: 'Alta' },
    { id: 'urgent', label: 'Urgente' }
  ];
  
  for (const priority of priorities) {
    try {
      await dbInstance
        .insert(lookupPriority)
        .values(priority)
        .onConflictDoNothing();
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
    { id: 'note_mention', label: 'Mención en Nota' }
  ];
  
  for (const type of notificationTypes) {
    try {
      await dbInstance
        .insert(lookupNotificationType)
        .values(type)
        .onConflictDoNothing();
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
    { id: 'commodities', label: 'Commodities' }
  ];
  
  for (const assetClass of assetClasses) {
    try {
      await dbInstance
        .insert(lookupAssetClass)
        .values(assetClass)
        .onConflictDoNothing();
    } catch (error) {
      logger.debug({ assetClass }, 'Asset class already exists or error occurred');
    }
  }
  
  logger.info('✅ Lookup tables seeded successfully');
}

/** Ensure critical auth columns and backfill username for admin if missing */
async function ensureCriticalColumns(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(
      `ALTER TABLE IF EXISTS public.users
       ADD COLUMN IF NOT EXISTS username text,
       ADD COLUMN IF NOT EXISTS username_normalized text;`
    );
    await client.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='users_username_normalized_unique'
         ) THEN
           CREATE UNIQUE INDEX users_username_normalized_unique
             ON public.users (username_normalized) WHERE username_normalized IS NOT NULL;
         END IF;
       END $$;`
    );
    await client.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_users_username_normalized'
         ) THEN
           CREATE INDEX idx_users_username_normalized
             ON public.users (username_normalized) WHERE username_normalized IS NOT NULL;
         END IF;
       END $$;`
    );
    // Backfill for admin if created without username fields
    await client.query(
      `UPDATE public.users
       SET username = 'gio', username_normalized = 'gio'
       WHERE email = 'giolivosantarelli@gmail.com' AND (username IS NULL OR username_normalized IS NULL);`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

export async function initializeDatabase(): Promise<void> {
  logger.info('🚀 Starting SYSTEM-ESSENTIAL database initialization...');
  
  try {
    // Step 1: Run migrations
    await runMigrations();
    
    // Step 2: Seed pipeline stages (SYSTEM-REQUIRED)
    await seedPipelineStages();
    
    // Step 3: Seed lookup tables (SYSTEM-REQUIRED)
    await seedLookupTables();

    // Step 4: Ensure critical columns exist for auth to work in dev
    await ensureCriticalColumns();
    
    // Step 5: Seed idempotent team "cactus"
    await seedCactusTeam();
    
    logger.info('✅ SYSTEM-ESSENTIAL database initialization completed successfully');
    logger.info('ℹ️  Note: Benchmarks/instruments must be fetched from yfinance based on user searches/portfolios');
  } catch (error) {
    logger.error({ err: error }, '❌ Database initialization failed');
    throw error;
  }
}

/** Seed idempotent team "cactus" for Teams feature */
async function seedCactusTeam(): Promise<void> {
  const dbi = db();
  try {
    const existing = await dbi.select().from(teams).where((teams.name as any).eq?.('cactus') ?? (eq as any)(teams.name as any, 'cactus')).limit(1);
    if (existing.length > 0) {
      logger.info({ teamId: existing[0].id }, '🌵 Team "cactus" already exists');
      return;
    }

    // Find a manager to assign as team manager
    const manager = await dbi.select().from(users).where(eq(users.role, 'manager')).limit(1);
    const managerUserId = manager[0]?.id || null;

    const [teamRow] = await dbi
      .insert(teams)
      .values({ name: 'cactus', managerUserId })
      .returning();

    if (managerUserId) {
      await dbi.insert(teamMembership).values({ teamId: teamRow.id, userId: managerUserId, role: 'lead' }).onConflictDoNothing();
    }
    logger.info({ teamId: teamRow.id, managerUserId }, '🌵 Seeded team "cactus"');
  } catch (err) {
    logger.warn({ err }, 'Failed to seed team "cactus" (non-fatal)');
  }
}
