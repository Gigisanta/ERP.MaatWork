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
 * REGLA CURSOR: This script is idempotent - safe to run multiple times
 * REGLA CURSOR: Does NOT seed AUM data (aumImportFiles, aumImportRows, etc.)
 */

import 'dotenv/config';

// Re-export all seed functionality from modular structure
export * from './seeds';
export { seedFull, seedFull as default } from './seeds';

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
