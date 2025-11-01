/**
 * Authentication test fixtures
 * Provides mock users, tokens, and auth helpers
 */

export interface TestUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'advisor';
  name: string;
}

export const mockUsers = {
  admin: {
    id: 'admin-test-123',
    email: 'admin@cactus.test',
    role: 'admin' as const,
    name: 'Admin Test',
  },
  manager: {
    id: 'manager-test-456',
    email: 'manager@cactus.test',
    role: 'manager' as const,
    name: 'Manager Test',
  },
  advisor: {
    id: 'advisor-test-789',
    email: 'advisor@cactus.test',
    role: 'advisor' as const,
    name: 'Advisor Test',
  },
};

/**
 * Generate a mock JWT token for testing
 */
export function generateMockToken(user: TestUser): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  }));
  
  return `${header}.${payload}.mock-signature`;
}

/**
 * Get auth headers for API testing
 */
export function getAuthHeaders(user: TestUser = mockUsers.advisor) {
  return {
    Authorization: `Bearer ${generateMockToken(user)}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Mock Supabase session
 */
export function getMockSession(user: TestUser = mockUsers.advisor) {
  return {
    access_token: generateMockToken(user),
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        role: user.role,
        name: user.name,
      },
    },
  };
}

