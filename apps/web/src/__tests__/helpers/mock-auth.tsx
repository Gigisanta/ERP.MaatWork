/**
 * Mock helpers for authentication (web)
 * 
 * Provides factory functions to create mocks for auth-related tests in web app
 */

// vi is available as a global from vitest/globals

export interface MockUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'advisor';
  fullName?: string;
}

/**
 * Creates a mock user with default values
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'advisor',
    fullName: 'Test User',
    ...overrides,
  };
}

/**
 * Creates a mock admin user
 */
export function createMockAdminUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
    fullName: 'Admin User',
    ...overrides,
  });
}

/**
 * Creates a mock manager user
 */
export function createMockManagerUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    id: 'manager-123',
    email: 'manager@example.com',
    role: 'manager',
    fullName: 'Manager User',
    ...overrides,
  });
}

/**
 * Creates a mock useAuth hook
 */
export function createMockUseAuth(overrides?: {
  user?: MockUser | null;
  login?: ReturnType<typeof vi.fn>;
  logout?: ReturnType<typeof vi.fn>;
  initialized?: boolean;
  loading?: boolean;
}) {
  return vi.fn(() => ({
    user: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    initialized: true,
    loading: false,
    ...overrides,
  }));
}

