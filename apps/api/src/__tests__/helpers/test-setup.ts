/**
 * Common test setup utilities
 *
 * AI_DECISION: Centralizar configuraciones comunes de beforeEach
 * Justificación: Muchos tests tienen el mismo setup repetido
 * Impacto: Reduce duplicación y mejora mantenibilidad
 */

import { vi, beforeEach } from 'vitest';
import { signUserToken } from '../../auth/jwt';
import { setupCommonMocks } from './test-mocks';

/**
 * Setup common test environment
 */
export function setupTestEnvironment() {
  beforeEach(async () => {
    vi.clearAllMocks();
  });
}

/**
 * Create common test users
 */
export const testUsers = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
    fullName: 'Admin User',
  },
  manager: {
    id: 'manager-123',
    email: 'manager@test.com',
    role: 'manager' as const,
    fullName: 'Manager User',
  },
  advisor: {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'advisor' as const,
    fullName: 'Advisor User',
  },
  staff: {
    id: 'staff-123',
    email: 'staff@test.com',
    role: 'staff' as const,
    fullName: 'Staff User',
  },
};

/**
 * Generate tokens for common test users
 */
export let testTokens: Record<string, string> = {};

export async function generateTestTokens() {
  if (Object.keys(testTokens).length === 0) {
    testTokens = {
      admin: await signUserToken(testUsers.admin),
      manager: await signUserToken(testUsers.manager),
      advisor: await signUserToken(testUsers.advisor),
      staff: await signUserToken(testUsers.staff),
    };
  }
  return testTokens;
}

/**
 * Setup for route tests with common mocks and tokens
 */
export function setupRouteTest() {
  setupCommonMocks();
  setupTestEnvironment();

  beforeEach(async () => {
    await generateTestTokens();
  });
}

/**
 * Common test data factories
 */
export const testData = {
  contact: {
    id: 'contact-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  team: {
    id: 'team-123',
    name: 'Test Team',
    description: 'A test team',
  },
  task: {
    id: 'task-123',
    title: 'Test Task',
    description: 'A test task',
    status: 'pending',
  },
  portfolio: {
    id: 'portfolio-123',
    name: 'Test Portfolio',
    description: 'A test portfolio',
  },
};
