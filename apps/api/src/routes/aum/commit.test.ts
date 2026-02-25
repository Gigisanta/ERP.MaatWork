/**
 * Tests para aum commit routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import commitRouter from './commit';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// AI_DECISION: Robust mocks for commit tests
const { mockDbInstance, mockTransactionWithLogging } = vi.hoisted(() => {
  const mockDbInstance = {
    execute: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve([])),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => Promise.resolve([])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (onFullfilled: (value: unknown) => unknown) => Promise.resolve([]).then(onFullfilled),
  };

  const mockTransactionWithLogging = vi.fn();
  return { mockDbInstance, mockTransactionWithLogging };
});

vi.mock('@maatwork/db', () => ({
  db: vi.fn(() => mockDbInstance),
  aumImportFiles: { id: 'id', status: 'status' },
  aumImportRows: {
    id: 'id',
    fileId: 'file_id',
    matchStatus: 'match_status',
    isPreferred: 'is_preferred',
  },
  brokerAccounts: {},
  contacts: {},
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    { raw: vi.fn((str: string) => ({ sql: str, values: [] })) }
  ),
  eq: vi.fn((col: unknown, val: unknown) => ({ column: col, value: val })),
  and: vi.fn((...args: unknown[]) => ({ args })),
}));

vi.mock('@/auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-123', role: 'admin' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => {
    req.user = { id: 'admin-123', role: 'admin' };
    next();
  }),
}));

vi.mock('@/auth/authorization', () => ({
  canAccessAumFile: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('@/utils/database/db-transactions', () => ({
  transactionWithLogging: mockTransactionWithLogging,
}));

describe('AUM Commit Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: commitRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    // Reset defaults
    mockDbInstance.execute.mockResolvedValue({ rowCount: 0, rows: [] });
    mockDbInstance.returning.mockImplementation(() => Promise.resolve([]));
    mockDbInstance.limit.mockImplementation(() => Promise.resolve([]));

    // Default transaction mock
    mockTransactionWithLogging.mockImplementation(async (_log, _name, callback) => {
      return await callback(mockDbInstance as unknown as ReturnType<typeof db>);
    });
  });

  describe('POST /admin/aum/uploads/:fileId/commit', () => {
    it('debería commitear archivo exitosamente', async () => {
      mockDbInstance.limit.mockResolvedValueOnce([
        { id: 'file-123', status: 'parsed', broker: 'balanz' },
      ]); // file

      // For ambiguousRows, it doesn't call limit(), it just awaits the query
      // So we need to mock the where() to return a promise or handle it
      mockDbInstance.where.mockReturnValueOnce({
        then: (onFullfilled: (value: unknown) => unknown) =>
          Promise.resolve([{ id: 'file-123', status: 'parsed', broker: 'balanz' }]).then(
            onFullfilled
          ),
        limit: vi.fn().mockResolvedValue([{ id: 'file-123', status: 'parsed', broker: 'balanz' }]),
      }); // for file query

      mockDbInstance.where.mockReturnValueOnce(Promise.resolve([])); // for ambiguousRows
      mockDbInstance.where.mockReturnValueOnce(
        Promise.resolve([
          // for rows to commit
          { id: 'row-1', accountNumber: '123', matchStatus: 'matched', isPreferred: true },
        ])
      );

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('debería retornar 404 cuando archivo no existe', async () => {
      mockDbInstance.where.mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([]),
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body.error).toBe('Resource not found');
    });

    it('debería retornar 400 cuando hay filas ambiguous', async () => {
      mockDbInstance.where.mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([{ id: 'file-123', status: 'parsed' }]),
      });
      mockDbInstance.where.mockReturnValueOnce(
        Promise.resolve([{ id: 'row-ambiguous', matchStatus: 'ambiguous' }])
      );

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('Invalid request data');
    });
  });
});
