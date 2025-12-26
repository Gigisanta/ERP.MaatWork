/**
 * SYSTEM-ESSENTIAL Database Seeding Script
 *
 * Seeds only SYSTEM-REQUIRED data:
 * - Pipeline stages (7 required stages for CRM functionality)
 * - Lookup tables (task status, priority, notification types, asset classes)
 *
 * NO SIMULATED/FICTIONAL DATA:
 * - Benchmarks/instruments (must be fetched from yfinance based on user needs)
 * - Notification templates (system functionality, pre-configured separately)
 *
 * Can be run manually via: pnpm -F @maatwork/db seed:all
 *
 * REGLA CURSOR: This script is idempotent - safe to run multiple times
 */

import 'dotenv/config';
import {
  db,
  pipelineStages,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  lookupAssetClass,
} from './index';
import { eq } from 'drizzle-orm';

/**
 * Seed the 7 required pipeline stages
 */
async function seedPipelineStages() {
  console.log('🌱 Seeding pipeline stages...');

  const stages = [
    {
      name: 'Prospecto',
      description: 'Contacto inicial identificado',
      order: 1,
      color: '#3b82f6', // Azul
      wipLimit: null,
    },
    {
      name: 'Contactado',
      description: 'Primer contacto realizado',
      order: 2,
      color: '#8b5cf6', // Morado
      wipLimit: null,
    },
    {
      name: 'Primera reunion',
      description: 'Primera reunión agendada o realizada',
      order: 3,
      color: '#f59e0b', // Amarillo/Naranja
      wipLimit: null,
    },
    {
      name: 'Segunda reunion',
      description: 'Segunda reunión agendada o realizada',
      order: 4,
      color: '#f97316', // Naranja
      wipLimit: null,
    },
    {
      name: 'Cliente',
      description: 'Cliente activo',
      order: 5,
      color: '#10b981', // Verde
      wipLimit: null,
    },
    {
      name: 'Cuenta vacia',
      description: 'Cliente sin saldo',
      order: 6,
      color: '#6b7280', // Gris
      wipLimit: null,
    },
    {
      name: 'Caido',
      description: 'Cliente perdido o inactivo',
      order: 7,
      color: '#ef4444', // Rojo
      wipLimit: null,
    },
  ];

  for (const stage of stages) {
    try {
      // Verificar si la etapa ya existe por nombre
      const existing = await db()
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.name, stage.name))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar etapa existente
        await db()
          .update(pipelineStages)
          .set({
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(pipelineStages.id, existing[0].id));

        console.log(`✅ Updated stage: ${stage.name}`);
      } else {
        // Crear nueva etapa
        await db().insert(pipelineStages).values({
          name: stage.name,
          description: stage.description,
          order: stage.order,
          color: stage.color,
          wipLimit: stage.wipLimit,
          isActive: true,
        });

        console.log(`✅ Created stage: ${stage.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing stage ${stage.name}:`, error);
    }
  }

  console.log('✅ Pipeline stages seeded successfully!');
}

/**
 * Seed lookup tables with essential data
 */
async function seedLookupTables() {
  console.log('🌱 Seeding lookup tables...');

  // Task Status lookup
  const taskStatuses = [
    { id: 'open', label: 'Abierta' },
    { id: 'in_progress', label: 'En Progreso' },
    { id: 'completed', label: 'Completada' },
    { id: 'cancelled', label: 'Cancelada' },
  ];

  for (const status of taskStatuses) {
    try {
      await db().insert(lookupTaskStatus).values(status).onConflictDoNothing();
      console.log(`  ✓ Task status: ${status.label}`);
    } catch (err: unknown) {
      type ErrorWithMessage = {
        message?: string;
      };
      const error = err as ErrorWithMessage;
      if (!error.message?.includes('UNIQUE')) {
        console.error(`  ✗ Error with task status ${status.label}:`, error.message);
      }
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
      await db().insert(lookupPriority).values(priority).onConflictDoNothing();
      console.log(`  ✓ Priority: ${priority.label}`);
    } catch (err: unknown) {
      type ErrorWithMessage = {
        message?: string;
      };
      const error = err as ErrorWithMessage;
      if (!error.message?.includes('UNIQUE')) {
        console.error(`  ✗ Error with priority ${priority.label}:`, error.message);
      }
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
      await db().insert(lookupNotificationType).values(type).onConflictDoNothing();
      console.log(`  ✓ Notification type: ${type.label}`);
    } catch (err: unknown) {
      type ErrorWithMessage = {
        message?: string;
      };
      const error = err as ErrorWithMessage;
      if (!error.message?.includes('UNIQUE')) {
        console.error(`  ✗ Error with notification type ${type.label}:`, error.message);
      }
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

  for (const assetClass of assetClasses) {
    try {
      await db().insert(lookupAssetClass).values(assetClass).onConflictDoNothing();
      console.log(`  ✓ Asset class: ${assetClass.label}`);
    } catch (err: unknown) {
      type ErrorWithMessage = {
        message?: string;
      };
      const error = err as ErrorWithMessage;
      if (!error.message?.includes('UNIQUE')) {
        console.error(`  ✗ Error with asset class ${assetClass.label}:`, error.message);
      }
    }
  }

  console.log('✅ Lookup tables seeded successfully!');
}

/**
 * Main seeding function
 * Runs SYSTEM-ESSENTIAL seed operations only
 */
async function seedAll() {
  console.log('🌱 Starting SYSTEM-ESSENTIAL database seeding...\n');

  try {
    // Seed pipeline stages (SYSTEM-REQUIRED)
    await seedPipelineStages();
    console.log('');

    // Seed lookup tables (SYSTEM-REQUIRED)
    await seedLookupTables();
    console.log('');

    console.log('✅ SYSTEM-ESSENTIAL seeding completed successfully!');
    console.log(
      'ℹ️  Note: Benchmarks/instruments must be fetched from yfinance based on user searches/portfolios'
    );
    console.log(
      'ℹ️  Note: Notification templates are system functionality, pre-configured separately'
    );
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Execute seeding if this script is run directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('👋 Seeding finalizado. Puedes cerrar este proceso.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error fatal:', err);
      process.exit(1);
    });
}

export { seedAll, seedPipelineStages, seedLookupTables };
