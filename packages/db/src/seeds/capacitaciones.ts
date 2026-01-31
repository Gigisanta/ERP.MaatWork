/**
 * Seed Capacitaciones
 *
 * Seeds training/courses data using actual schema structure.
 * capacitaciones: titulo, tema, link, fecha, createdByUserId
 */

import { db } from '../index';
import { capacitaciones, users } from '../schema';
import { eq } from 'drizzle-orm';
import { getRandomDateOnly } from './helpers';

// Capacitaciones data constants using Spanish column names
const CAPACITACIONES_DATA = [
  {
    titulo: 'Introducción al Mercado de Capitales',
    tema: 'Producto',
    link: 'https://example.com/curso-mercado-capitales',
  },
  {
    titulo: 'Análisis Técnico Avanzado',
    tema: 'Método',
    link: 'https://example.com/analisis-tecnico',
  },
  {
    titulo: 'Regulación CNV',
    tema: 'Administración',
    link: 'https://example.com/regulacion-cnv',
  },
  {
    titulo: 'Gestión de Carteras',
    tema: 'Producto',
    link: 'https://example.com/gestion-carteras',
  },
  {
    titulo: 'Comunicación Efectiva con Clientes',
    tema: 'Carácter',
    link: 'https://example.com/comunicacion-efectiva',
  },
  {
    titulo: 'Prevención de Lavado de Activos',
    tema: 'Administración',
    link: 'https://example.com/prevencion-lavado',
  },
  {
    titulo: 'Podcast: Finanzas Personales',
    tema: 'Podcast',
    link: 'https://example.com/podcast-finanzas',
  },
  {
    titulo: 'TED: El poder del ahorro',
    tema: 'TED',
    link: 'https://example.com/ted-ahorro',
  },
  {
    titulo: 'Seguros de Vida - Zurich',
    tema: 'Zurich',
    link: 'https://example.com/zurich-seguros',
  },
  {
    titulo: 'Marketing Digital para Asesores',
    tema: 'Mktg Digital',
    link: 'https://example.com/marketing-digital',
  },
];

/**
 * Seed capacitaciones
 */
export async function seedCapacitaciones(advisorUsers: (typeof users.$inferSelect)[]) {
  // eslint-disable-next-line no-console
    console.log('📚 Seeding capacitaciones...');

  const createdCapacitaciones: (typeof capacitaciones.$inferSelect)[] = [];

  // Get an admin/manager user to be the creator
  const creatorUser = advisorUsers[0];
  if (!creatorUser) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️ No users available for capacitacion creation');
    return [];
  }

  // Create capacitaciones
  for (const capData of CAPACITACIONES_DATA) {
    const existing = await db()
      .select()
      .from(capacitaciones)
      .where(eq(capacitaciones.titulo, capData.titulo))
      .limit(1);

    if (existing.length === 0) {
      const fecha = Math.random() > 0.3 ? getRandomDateOnly(180, 0) : null;

      const [created] = await db()
        .insert(capacitaciones)
        .values({
          titulo: capData.titulo,
          tema: capData.tema,
          link: capData.link,
          fecha,
          createdByUserId: creatorUser.id,
        })
        .returning();

      createdCapacitaciones.push(created);
      // eslint-disable-next-line no-console
    console.log(`  ✓ Created capacitación: ${capData.titulo}`);
    } else {
      createdCapacitaciones.push(existing[0]!);
    }
  }

  // eslint-disable-next-line no-console
    console.log(`✅ Capacitaciones seeded: ${createdCapacitaciones.length} courses\n`);
  return createdCapacitaciones;
}
