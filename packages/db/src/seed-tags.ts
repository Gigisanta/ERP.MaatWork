import { db } from './index';
import { tags } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Seed initial tags for the system.
 * Based on user requirements:
 * - Options (linea de negocio zurich)
 * - Invest (linea de negocio Zurich) -> "Zurich" (Invest is likely part of Zurich line)
 * - Impact (linea de negocio Zurich)
 * - Balanz (linea de negocio inversiones)
 * - Patrimonial (linea de negocio patrimonial)
 */
export async function seedTags() {
  console.log('🌱 Seeding tags...');

  const defaultTags = [
    {
      name: 'Options',
      color: '#3B82F6', // Blue
      scope: 'contact',
      businessLine: 'zurich',
      description: 'Línea de negocio Zurich',
      isSystem: true,
    },
    {
      name: 'Invest',
      color: '#10B981', // Green
      scope: 'contact',
      businessLine: 'zurich',
      description: 'Línea de negocio Zurich',
      isSystem: true,
    },
    {
      name: 'Impact',
      color: '#8B5CF6', // Purple
      scope: 'contact',
      businessLine: 'zurich',
      description: 'Línea de negocio Zurich',
      isSystem: true,
    },
    {
      name: 'Balanz',
      color: '#F59E0B', // Orange
      scope: 'contact',
      businessLine: 'inversiones',
      description: 'Línea de negocio Inversiones',
      isSystem: true,
    },
    {
      name: 'Patrimonial',
      color: '#EC4899', // Pink
      scope: 'contact',
      businessLine: 'patrimonial',
      description: 'Línea de negocio Patrimonial',
      isSystem: true,
    },
  ];

  for (const tag of defaultTags) {
    // Check if tag exists by name and scope
    const existing = await db()
      .select()
      .from(tags)
      .where(eq(tags.name, tag.name))
      .limit(1);

    if (existing.length === 0) {
      console.log(`Creating tag: ${tag.name}`);
      await db().insert(tags).values(tag);
    } else {
        // Optional: Update existing tags if needed, but for seed we typically skip or update if system
        console.log(`Tag already exists: ${tag.name}`);
    }
  }

  console.log('✅ Tags seeded successfully');
}


