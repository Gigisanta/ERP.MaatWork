/**
 * Authentication mocks for testing
 * 
 * Provides utilities to mock authentication context and hooks
 */

// vi is available as a global from vitest/globals
import type { ReactNode } from 'react';

export interface MockUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'advisor';
  fullName?: string;
}

/**
 * Create a mock user
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: overrides?.id || 'test-user-id',
    email: overrides?.email || 'test@example.com',
    role: overrides?.role || 'advisor',
    fullName: overrides?.fullName || 'Test User',
  };
}

/**
 * Create a mock admin user
 */
export function createMockAdmin(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    ...overrides,
    role: 'admin',
  });
}

/**
 * Create a mock manager user
 */
export function createMockManager(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    ...overrides,
    role: 'manager',
  });
}

/**
 * Create a mock advisor user
 */
export function createMockAdvisor(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    ...overrides,
    role: 'advisor',
  });
}

/**
 * Mock AuthContext value
 */
export interface MockAuthContextValue {
  user: MockUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Create mock auth context value
 */
export function createMockAuthContext(
  user: MockUser | null = null,
  overrides?: Partial<MockAuthContextValue>
): MockAuthContextValue {
  return {
    user,
    isLoading: false,
    isAuthenticated: user !== null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Mock AuthContext provider component
 */
export function MockAuthProvider({
  children,
  user = null,
  ...overrides
}: {
  children: ReactNode;
  user?: MockUser | null;
} & Partial<MockAuthContextValue>) {
  const value = createMockAuthContext(user, overrides);
  
  // In actual implementation, this would use React Context
  // For testing, we'll just return children
  return children as unknown as ReactNode;
}

/**
 * Mock useAuth hook
 */
export function mockUseAuth(user: MockUser | null = null, overrides?: Partial<MockAuthContextValue>) {
  const mockAuth = createMockAuthContext(user, overrides);
  
  vi.mock('@/app/auth/AuthContext', () => ({
    useAuth: () => mockAuth,
    AuthProvider: MockAuthProvider,
  }));
  
  return mockAuth;
}

/**
 * Mock useRequireAuth hook
 */
export function mockUseRequireAuth(user: MockUser | null = null) {
  const mockAuth = createMockAuthContext(user);
  
  vi.mock('@/app/auth/useRequireAuth', () => ({
    useRequireAuth: () => mockAuth,
  }));
  
  return mockAuth;
}

