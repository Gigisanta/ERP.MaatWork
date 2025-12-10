/**
 * FULL Database Seeding Script
 *
 * Seeds comprehensive test data for all app functionalities (except AUM).
 * Generates realistic data for testing: users, teams, contacts, tasks, notes,
 * portfolios, broker data, notifications, and more.
 *
 * Can be run manually via: pnpm -F @cactus/db seed:full
 *
 * REFACTORED: This file now re-exports from modular seed files in ./seeds/
 * See ./seeds/index.ts for the orchestrator and individual seed modules.
 *
 * AI_DECISION: Eliminar barrel exports (export *) para mejorar tree-shaking
 * Justificación: Los barrel exports rompen tree-shaking y aumentan el bundle size
 * Impacto: Mejor optimización de bundle, imports más explícitos
 *
 * REGLA CURSOR: This script is idempotent - safe to run multiple times
 * REGLA CURSOR: Does NOT seed AUM data (aumImportFiles, aumImportRows, etc.)
 */

import 'dotenv/config';

// Re-export seed functionality from modular structure (specific exports for tree-shaking)
export {
  // Helper functions
  getRandomElement,
  getRandomElements,
  getRandomDate,
  getRandomDateOnly,
  ARGENTINE_FIRST_NAMES,
  ARGENTINE_LAST_NAMES,
  generateRandomName,
  generateRandomEmail,
  generateRandomPhone,
  generateRandomDNI,
  hashPassword,
  // Dependencies
  seedAssetClasses,
  seedTaskStatuses,
  seedPriorities,
  seedNotificationTypes,
  seedPipelineStages,
  ensureDependencies,
  // Seed functions
  seedUsers,
  seedTeams,
  seedContacts,
  seedTags,
  seedTasks,
  seedNotes,
  seedPortfolios,
  seedBrokerData,
  seedNotifications,
  seedActivityEvents,
  seedCapacitaciones,
  seedSegments,
  // Main orchestrator
  seedFull,
  type SeedFullOptions,
} from './seeds';

// Default export for direct execution
export { seedFull as default } from './seeds';

// CLI entry point
import { seedFull } from './seeds';

async function main() {
  try {
    await seedFull();
    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
