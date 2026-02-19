/**
 * Seed Dependencies
 *
 * Seeds lookup tables and pipeline stages that other seeds depend on.
 * Uses actual schema: lookup tables have `id` (text PK) and `label` columns.
 */

import { db } from '../index';
import {
  lookupAssetClass,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  pipelineStages,
} from '../schema';
import { eq } from 'drizzle-orm';

// Lookup data constants - id is both the key and logical identifier
const ASSET_CLASSES = [
  { id: 'equity', label: 'Renta Variable' },
  { id: 'fixed_income', label: 'Renta Fija' },
  { id: 'cash', label: 'Efectivo' },
  { id: 'real_estate', label: 'Bienes Raíces' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'crypto', label: 'Criptomonedas' },
];

const TASK_STATUSES = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'in_progress', label: 'En Progreso' },
  { id: 'completed', label: 'Completado' },
  { id: 'cancelled', label: 'Cancelado' },
];

const PRIORITIES = [
  { id: 'low', label: 'Baja' },
  { id: 'medium', label: 'Media' },
  { id: 'high', label: 'Alta' },
  { id: 'urgent', label: 'Urgente' },
];

const NOTIFICATION_TYPES = [
  { id: 'info', label: 'Información' },
  { id: 'warning', label: 'Advertencia' },
  { id: 'error', label: 'Error' },
  { id: 'success', label: 'Éxito' },
  { id: 'reminder', label: 'Recordatorio' },
  { id: 'meeting_assignment', label: 'Asignación de Reunión' },
];

const PIPELINE_STAGES = [
  { name: 'Prospecto', order: 1, color: '#6B7280' },
  { name: 'Contactado', order: 2, color: '#3B82F6' },
  { name: 'Primera reunion', order: 3, color: '#8B5CF6' },
  { name: 'Segunda reunion', order: 4, color: '#EC4899' },
  { name: 'Cliente', order: 5, color: '#10B981' },
  { name: 'Cuenta vacia', order: 6, color: '#F59E0B' },
  { name: 'Caido', order: 7, color: '#EF4444' },
];

/**
 * Seed asset class lookup table
 */
export async function seedAssetClasses() {
  // eslint-disable-next-line no-console
    console.log('  📋 Seeding asset classes...');

  for (const item of ASSET_CLASSES) {
    const existing = await db()
      .select()
      .from(lookupAssetClass)
      .where(eq(lookupAssetClass.id, item.id))
      .limit(1);

    if (existing.length === 0) {
      await db().insert(lookupAssetClass).values({ id: item.id, label: item.label });
    }
  }
}

/**
 * Seed task status lookup table
 */
export async function seedTaskStatuses() {
  // eslint-disable-next-line no-console
    console.log('  📋 Seeding task statuses...');

  for (const item of TASK_STATUSES) {
    const existing = await db()
      .select()
      .from(lookupTaskStatus)
      .where(eq(lookupTaskStatus.id, item.id))
      .limit(1);

    if (existing.length === 0) {
      await db().insert(lookupTaskStatus).values({ id: item.id, label: item.label });
    }
  }
}

/**
 * Seed priority lookup table
 */
export async function seedPriorities() {
  // eslint-disable-next-line no-console
    console.log('  📋 Seeding priorities...');

  for (const item of PRIORITIES) {
    const existing = await db()
      .select()
      .from(lookupPriority)
      .where(eq(lookupPriority.id, item.id))
      .limit(1);

    if (existing.length === 0) {
      await db().insert(lookupPriority).values({ id: item.id, label: item.label });
    }
  }
}

/**
 * Seed notification type lookup table
 */
export async function seedNotificationTypes() {
  // eslint-disable-next-line no-console
    console.log('  📋 Seeding notification types...');

  for (const item of NOTIFICATION_TYPES) {
    const existing = await db()
      .select()
      .from(lookupNotificationType)
      .where(eq(lookupNotificationType.id, item.id))
      .limit(1);

    if (existing.length === 0) {
      await db().insert(lookupNotificationType).values({ id: item.id, label: item.label });
    }
  }
}

/**
 * Seed pipeline stages
 */
export async function seedPipelineStages() {
  // eslint-disable-next-line no-console
    console.log('  🔄 Seeding pipeline stages...');
  const results: (typeof pipelineStages.$inferSelect)[] = [];

  for (const stage of PIPELINE_STAGES) {
    const existing = await db()
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.name, stage.name))
      .limit(1);

    if (existing.length === 0) {
      const [created] = await db()
        .insert(pipelineStages)
        .values({
          name: stage.name,
          order: stage.order,
          color: stage.color,
        })
        .returning();
      results.push(created);
    } else {
      results.push(existing[0]!);
    }
  }

  return results;
}

/**
 * Seed all dependency tables
 */
export async function ensureDependencies() {
  // eslint-disable-next-line no-console
    console.log('🔧 Ensuring dependencies exist...\n');

  await seedAssetClasses();
  await seedTaskStatuses();
  await seedPriorities();
  await seedNotificationTypes();
  const pipelineStagesList = await seedPipelineStages();

  // eslint-disable-next-line no-console
    console.log('✅ Dependencies ensured\n');

  return { pipelineStagesList };
}
