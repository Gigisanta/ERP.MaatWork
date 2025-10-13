import { db, pipelineStages } from './index';
import { eq } from 'drizzle-orm';

/**
 * Script para crear/actualizar las etapas del pipeline
 * Etapas requeridas:
 * 1. Prospecto
 * 2. Contactado
 * 3. Primera reunion
 * 4. Segunda reunion
 * 5. Cliente
 * 6. Cuenta vacia
 * 7. Caido
 */

async function seedPipelineStages() {
  console.log('🌱 Seeding pipeline stages...');

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
            updatedAt: new Date()
          })
          .where(eq(pipelineStages.id, existing[0].id));

        console.log(`✅ Updated stage: ${stage.name}`);
      } else {
        // Crear nueva etapa
        await db()
          .insert(pipelineStages)
          .values({
            name: stage.name,
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true
          });

        console.log(`✅ Created stage: ${stage.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing stage ${stage.name}:`, error);
    }
  }

  console.log('✅ Pipeline stages seeded successfully!');
}

// Ejecutar el seed
seedPipelineStages()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding pipeline stages:', error);
    process.exit(1);
  });


