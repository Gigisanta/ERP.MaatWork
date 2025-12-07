/**
 * Seed Full - Main Orchestrator
 * 
 * Coordinates all seed modules to populate the database with test data.
 * Modular structure allows running individual seeds or the full suite.
 * 
 * AI_DECISION: Eliminar barrel exports (export *) para mejorar tree-shaking
 * Justificación: Los barrel exports rompen tree-shaking y aumentan el bundle size
 * Impacto: Mejor optimización de bundle, imports más explícitos
 */

// ==========================================================
// Helper Functions
// ==========================================================
export {
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
  hashPassword
} from './helpers';

// ==========================================================
// Dependencies (Lookup Tables & Pipeline Stages)
// ==========================================================
export {
  seedAssetClasses,
  seedTaskStatuses,
  seedPriorities,
  seedNotificationTypes,
  seedPipelineStages,
  ensureDependencies
} from './dependencies';

// ==========================================================
// Seed Functions
// ==========================================================
export { seedUsers } from './users';
export { seedTeams } from './teams';
export { seedContacts } from './contacts';
export { seedTags } from './tags';
export { seedTasks, seedNotes } from './tasks-notes';
export { seedPortfolios } from './portfolios';
export { seedBrokerData } from './broker-data';
export { seedNotifications } from './notifications';
export { seedActivityEvents } from './activity-events';
export { seedCapacitaciones } from './capacitaciones';
export { seedSegments } from './segments';

// Import for orchestration
import { ensureDependencies } from './dependencies';
import { seedUsers } from './users';
import { seedTeams } from './teams';
import { seedContacts } from './contacts';
import { seedTags } from './tags';
import { seedTasks, seedNotes } from './tasks-notes';
import { seedPortfolios } from './portfolios';
import { seedBrokerData } from './broker-data';
import { seedNotifications } from './notifications';
import { seedActivityEvents } from './activity-events';
import { seedCapacitaciones } from './capacitaciones';
import { seedSegments } from './segments';

/**
 * Configuration options for seedFull
 */
export interface SeedFullOptions {
  skipDependencies?: boolean;
  skipUsers?: boolean;
  skipTeams?: boolean;
  skipContacts?: boolean;
  skipTags?: boolean;
  skipTasks?: boolean;
  skipNotes?: boolean;
  skipBrokerData?: boolean;
  skipPortfolios?: boolean;
  skipNotifications?: boolean;
  skipActivityEvents?: boolean;
  skipCapacitaciones?: boolean;
  skipSegments?: boolean;
}

/**
 * Run full database seed
 * 
 * Seeds the database in the correct order to satisfy dependencies:
 * 1. Dependencies (lookups, pipeline stages)
 * 2. Users (admin, managers, advisors)
 * 3. Teams (and memberships)
 * 4. Contacts (with pipeline stages)
 * 5. Tags (categories and assignments)
 * 6. Tasks & Notes
 * 7. Broker Data (accounts)
 * 8. Portfolios
 * 9. Notifications
 * 10. Activity Events
 * 11. Capacitaciones
 * 12. Segments
 */
export async function seedFull(options: SeedFullOptions = {}) {
  console.log('\n🌱 Starting full database seed...\n');
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    // 1. Dependencies
    let pipelineStagesList: Awaited<ReturnType<typeof ensureDependencies>>['pipelineStagesList'] = [];
    if (!options.skipDependencies) {
      const deps = await ensureDependencies();
      pipelineStagesList = deps.pipelineStagesList;
    }

    // 2. Users
    let adminUser: Awaited<ReturnType<typeof seedUsers>>['adminUser'] | undefined;
    let managerUsers: Awaited<ReturnType<typeof seedUsers>>['managerUsers'] | undefined;
    let advisorUsers: Awaited<ReturnType<typeof seedUsers>>['advisorUsers'] | undefined;
    
    if (!options.skipUsers) {
      const usersResult = await seedUsers();
      adminUser = usersResult.adminUser;
      managerUsers = usersResult.managerUsers;
      advisorUsers = usersResult.advisorUsers;
    }

    // 3. Teams
    let teamsList: Awaited<ReturnType<typeof seedTeams>> = [];
    if (!options.skipTeams && managerUsers && advisorUsers) {
      teamsList = await seedTeams(managerUsers, advisorUsers);
    }

    // 4. Contacts
    let contactsList: Awaited<ReturnType<typeof seedContacts>> = [];
    if (!options.skipContacts && advisorUsers) {
      contactsList = await seedContacts(advisorUsers, teamsList, pipelineStagesList);
    }

    // 5. Tags
    if (!options.skipTags && contactsList.length > 0) {
      await seedTags(contactsList);
    }

    // 6. Tasks
    if (!options.skipTasks && contactsList.length > 0 && advisorUsers) {
      await seedTasks(contactsList, advisorUsers);
    }

    // 7. Notes
    if (!options.skipNotes && contactsList.length > 0 && advisorUsers) {
      await seedNotes(contactsList, advisorUsers);
    }

    // 8. Broker Data
    if (!options.skipBrokerData && contactsList.length > 0 && advisorUsers) {
      await seedBrokerData(contactsList, advisorUsers);
    }

    // 9. Portfolios
    if (!options.skipPortfolios && contactsList.length > 0 && advisorUsers) {
      await seedPortfolios(contactsList, advisorUsers);
    }

    // 10. Notifications
    if (!options.skipNotifications && advisorUsers && contactsList.length > 0) {
      await seedNotifications(advisorUsers, contactsList);
    }

    // 11. Activity Events
    if (!options.skipActivityEvents && advisorUsers && contactsList.length > 0) {
      await seedActivityEvents(advisorUsers, contactsList);
    }

    // 12. Capacitaciones
    if (!options.skipCapacitaciones && advisorUsers) {
      await seedCapacitaciones(advisorUsers);
    }

    // 13. Segments
    if (!options.skipSegments && contactsList.length > 0 && advisorUsers) {
      await seedSegments(contactsList, advisorUsers);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(50));
    console.log(`\n🎉 Full seed completed in ${duration}s\n`);

    return {
      success: true,
      duration,
      counts: {
        users: advisorUsers ? advisorUsers.length + (managerUsers?.length ?? 0) + 1 : 0,
        teams: teamsList.length,
        contacts: contactsList.length
      }
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ Seed failed after ${duration}s:`, error);
    throw error;
  }
}

// Export default for direct execution
export default seedFull;
