/**
 * Tests para aum rows routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import rowsRouter from './rows/index';
import aumRouter from './index';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// AI_DECISION: Robust mocks for rows tests
const { mockDbInstance } = vi.hoisted(() => {
  interface MockDb {
    execute: unknown;
    select: unknown;
    from: unknown;
    where: unknown;
    limit: unknown;
    insert: unknown;
    values: unknown;
    returning: unknown;
    update: unknown;
    set: unknown;
    delete: unknown;
    then?: (onFullfilled: (value: unknown) => unknown) => Promise<unknown>;
  }
  const mockDbInstance: MockDb = {
    execute: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => Promise.resolve([])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  mockDbInstance.then = (onFullfilled: (value: unknown) => unknown) => Promise.resolve([]).then(onFullfilled);
  return { mockDbInstance };
});

vi.mock('@maatwork/db', () => ({
  db: vi.fn(() => mockDbInstance),
  aumImportRows: { id: 'id', fileId: 'file_id', matchStatus: 'match_status' },
  aumImportFiles: { id: 'id', broker: 'broker' },
  contacts: {},
  users: {},
  advisorAliases: {},
  aumMonthlySnapshots: {},
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    { 
      raw: vi.fn((str: string) => ({ sql: str, values: [] })),
      join: vi.fn((arr: unknown[], sep: string) => ({ sql: 'joined', values: [] }))
    }
  ),
  eq: vi.fn((col: unknown, val: unknown) => ({ column: col, value: val })),
  and: vi.fn((...args: unknown[]) => ({ args })),
  or: vi.fn((...args: unknown[]) => ({ args })),
  desc: vi.fn((col: unknown) => col),
  asc: vi.fn((col: unknown) => col),
  isNull: vi.fn((col: unknown) => col),
  isNotNull: vi.fn((col: unknown) => col),
  inArray: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  ilike: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

vi.mock('@/auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-123', role: 'admin', email: 'admin@example.com' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => {
    req.user = { id: 'admin-123', role: 'admin', email: 'admin@example.com' };
    next();
  }),
}));

vi.mock('@/auth/authorization', () => ({
  getUserAccessScope: vi.fn().mockResolvedValue({
    userId: 'user-123',
    role: 'admin',
    accessibleAdvisorIds: [],
    canSeeUnassigned: true,
    canAssignToOthers: true,
    canReassign: true,
  }),
  buildContactAccessFilter: vi.fn().mockReturnValue({
    whereClause: { sql: '1=1' },
    description: 'admin access',
  }),
}));

vi.mock('@/utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('@/services/aum', () => ({
  matchRow: vi.fn(),
  matchContactByAccountNumber: vi.fn(),
  matchContactByHolderName: vi.fn(),
  matchAdvisor: vi.fn(),
}));

vi.mock('@/routes/aum/rows/cache', () => ({
  getCacheKey: vi.fn(() => 'test-key'),
  getCachedCount: vi.fn(() => null),
  setCachedCount: vi.fn(),
}));

describe('AUM Rows Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: aumRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
    
    mockDbInstance.execute.mockResolvedValue({ rowCount: 0, rows: [] });
    mockDbInstance.limit.mockImplementation(() => Promise.resolve([]));
  });

  describe('GET /admin/aum/rows/all', () => {
    it('debería retornar rows con paginación', async () => {
      mockDbInstance.execute
        .mockResolvedValueOnce({ rows: [{ total: 10 }] }) // count
        .mockResolvedValueOnce({ rows: [{ id: 'row-1', account_number: '123' }] }); // select

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/rows/all?limit=10&offset=0')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.rows).toHaveLength(1);
    });
  });

  describe('POST /admin/aum/uploads/:fileId/match', () => {
    it('debería match row exitosamente', async () => {
      // 1. Select file
      mockDbInstance.where.mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([{ id: 'file-1' }])
      });
      
      // 2. Select row (if isPreferred is true, which is default in body)
      mockDbInstance.where.mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([{ account_number: '123' }])
      });

      // 3. Update row
      mockDbInstance.where.mockResolvedValueOnce(undefined);
      
      // 4. Update file stats (execute)
      mockDbInstance.execute.mockResolvedValueOnce({ 
        rows: [{ total_parsed: 10, total_matched: 5, total_unmatched: 5 }] 
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-1/match')
        .set('Cookie', `token=${adminToken}`)
        .send({
          rowId: 'row-1',
          matchedContactId: 'contact-1',
          matchedUserId: 'user-1',
        })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });
  });
});
