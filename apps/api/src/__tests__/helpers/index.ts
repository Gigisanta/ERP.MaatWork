/**
 * Test helpers index
 * 
 * Central export for all test helpers
 */

// Test database helpers
export {
  getTestDb,
  withTransaction,
  cleanupTestDatabase,
  resetTestDatabase,
  isTestMode,
  getTestDatabaseUrl
} from './test-db';

// Test fixtures
export {
  createTestContact,
  createTestTag,
  createTestTask,
  createTestNote,
  createTestTeam,
  createTestPipelineStage,
  createTestContacts,
  cleanupTestFixtures
} from './test-fixtures';

// Test server helpers
export {
  createTestApp,
  setupTestDatabase,
  cleanupTestServer,
  startTestServer,
  stopTestServer,
  getTestServerPort,
  getTestServerUrl,
  createAuthenticatedRequest,
  createMockRequest,
  createMockResponse,
  createMockNext
} from './test-server';
// Export test-auth helpers with specific names to avoid conflicts
export { 
  createMockAuthRequest
} from './test-auth';
// Export mock-auth helpers
export {
  createMockUser
} from './mock-auth';

// Re-export AuthUser type from auth/types
export type { AuthUser } from '../../auth/types';
export type MockUser = import('../../auth/types').AuthUser;

// Create mock auth context helper
export function createMockAuthContext(user: import('../../auth/types').AuthUser) {
  return {
    user,
    headers: {
      authorization: `Bearer mock-token`,
    },
    cookies: {
      token: 'mock-token',
    },
  };
}

