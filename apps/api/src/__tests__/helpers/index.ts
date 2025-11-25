/**
 * Test helpers index
 * 
 * Central export for all test helpers
 */

export * from './test-db';
export * from './test-fixtures';
export * from './test-server';
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

