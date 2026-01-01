/**
 * Seed Career Plan Levels
 *
 * Inserta niveles de carrera por defecto para el plan de carrera comercial.
 * Ejecutar: pnpm -F @maatwork/db seed:career-plan
 */

import 'dotenv/config';
import { db, careerPlanLevels } from './index';

const defaultLevels = [
  {
    category: 'AGENTE F. JUNIOR',
    level: 'Nivel 1 Junior',
    levelNumber: 1,
    index: '1.0',
    percentage: '10',
    annualGoalUsd: 50000,
    isActive: true,
  },
  {
    category: 'AGENTE F. JUNIOR',
    level: 'Nivel 2 Junior',
    levelNumber: 2,
    index: '1.5',
    percentage: '15',
    annualGoalUsd: 100000,
    isActive: true,
  },
  {
    category: 'AGENTE F. SEMI-SENIOR',
    level: 'Nivel 3 Semi-Senior',
    levelNumber: 3,
    index: '2.0',
    percentage: '20',
    annualGoalUsd: 200000,
    isActive: true,
  },
  {
    category: 'AGENTE F. SEMI-SENIOR',
    level: 'Nivel 4 Semi-Senior',
    levelNumber: 4,
    index: '2.5',
    percentage: '25',
    annualGoalUsd: 350000,
    isActive: true,
  },
  {
    category: 'AGENTE F. SENIOR',
    level: 'Nivel 5 Senior',
    levelNumber: 5,
    index: '3.0',
    percentage: '30',
    annualGoalUsd: 500000,
    isActive: true,
  },
  {
    category: 'AGENTE F. SENIOR',
    level: 'Nivel 6 Senior',
    levelNumber: 6,
    index: '3.5',
    percentage: '35',
    annualGoalUsd: 750000,
    isActive: true,
  },
  {
    category: 'MASTER',
    level: 'Nivel 7 Master',
    levelNumber: 7,
    index: '4.0',
    percentage: '40',
    annualGoalUsd: 1000000,
    isActive: true,
  },
];

async function seedCareerPlanLevels() {
  console.log('🌱 Seeding career plan levels...');

  try {
    // Check if levels already exist
    const existing = await db().select().from(careerPlanLevels);
    if (existing.length > 0) {
      console.log(`ℹ️  Ya existen ${existing.length} niveles de carrera. Saltando seed.`);
      return;
    }

    // Insert default levels
    await db().insert(careerPlanLevels).values(defaultLevels);
    console.log(`✅ Insertados ${defaultLevels.length} niveles de carrera`);
  } catch (error) {
    console.error('❌ Error seeding career plan levels:', error);
    throw error;
  }
}

seedCareerPlanLevels()
  .then(() => {
    console.log('✅ Career plan levels seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Career plan levels seed failed:', error);
    process.exit(1);
  });
