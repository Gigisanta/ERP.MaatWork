/**
 * Common test mocks for API tests
 *
 * AI_DECISION: Centralizar mocks comunes para reducir duplicación
 * Justificación: Muchos archivos de test tienen los mismos mocks
 * Impacto: Código más mantenible y consistente
 */

import { vi } from 'vitest';

/**
 * Mock @cactus/db with common database functions
 */
export function mockDatabase() {
  vi.mock('@cactus/db', () => ({
    db: vi.fn(),
    // Common database tables
    users: {},
    teams: {},
    teamMembership: {},
    contacts: {},
    tasks: {},
    notes: {},
    aumImportFiles: {},
    aumImportRows: {},
    aumMonthlySnapshots: {},
    advisorAccountMapping: {},
    advisorAliases: {},
    brokerAccounts: {},
    instruments: {},
    pricesDaily: {},
    pricesIntraday: {},
    portfolioTemplates: {},
    portfolioTemplateLines: {},
    clientPortfolioAssignments: {},
    benchmarks: {},
    benchmarkComponents: {},
    tags: {},
    contactTags: {},
    notifications: {},
    notificationTypes: {},
    pipelineStages: {},
    capacitaciones: {},
    teamsGoals: {},
    monthlyGoals: {},
    activityEvents: {},
    segments: {},
    // Common functions
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    ilike: vi.fn(),
    sql: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    isNull: vi.fn(),
    isNotNull: vi.fn(),
  }));
}

/**
 * Mock auth middlewares
 */
export function mockAuthMiddlewares() {
  vi.mock('../../auth/middlewares', () => ({
    requireAuth: vi.fn((req: any, res: any, next: any) => next()),
    requireRole: vi.fn(() => (req: any, res: any, next: any) => next()),
  }));
}

/**
 * Mock JWT functions
 */
export function mockJWT() {
  vi.mock('../../auth/jwt', () => ({
    signUserToken: vi.fn(),
    verifyToken: vi.fn(),
    getTokenFromRequest: vi.fn(),
  }));
}

/**
 * Setup common mocks for API route tests
 */
export function setupCommonMocks() {
  mockDatabase();
  mockAuthMiddlewares();
  mockJWT();
}

/**
 * Mock Express request/response utilities
 */
export function mockExpressUtils() {
  vi.mock('express', () => ({
    Router: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      use: vi.fn(),
    })),
  }));
}

/**
 * Create common mock implementations for database operations
 */
export const mockDbOperations = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: vi.fn(),
          })),
        })),
        where: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
      execute: vi.fn(),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      execute: vi.fn(),
      onConflictDoUpdate: vi.fn(() => ({
        execute: vi.fn(),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn(),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      execute: vi.fn(),
    })),
  })),
};
