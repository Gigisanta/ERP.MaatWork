/**
 * Tests para aum admin routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import adminRouter from './admin';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// AI_DECISION: Use vi.hoisted for robust mocking
const { mockDbInstance } = vi.hoisted(() => {
  const mockDbInstance = {
    execute: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return { mockDbInstance };
});

vi.mock('@maatwork/db', () => ({
  db: vi.fn(() => mockDbInstance),
  aumImportFiles: { id: 'id', status: 'status', originalFilename: 'file.csv' },
  aumImportRows: { id: 'id', fileId: 'file_id' },
  advisorAccountMapping: {},
  advisorAliases: {},
  eq: vi.fn(),
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

describe('AUM Admin Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: adminRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    // Reset mock defaults
    mockDbInstance.execute.mockResolvedValue({ rowCount: 0, rows: [] });
    mockDbInstance.returning.mockResolvedValue([]);
    mockDbInstance.limit.mockResolvedValue([]);
  });

  describe('DELETE /admin/aum/uploads/:fileId', () => {
    it('debería eliminar archivo exitosamente', async () => {
      mockDbInstance.limit.mockResolvedValue([
        {
          id: 'file-123',
          status: 'parsed',
          originalFilename: 'test.csv',
        },
      ]);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ ok: true, message: 'Archivo eliminado exitosamente' });
    });
  });

  describe('DELETE /admin/aum/purge-all', () => {
    it('debería purgar todo el sistema AUM', async () => {
      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);
    });
  });

  describe('POST /admin/aum/cleanup-duplicates', () => {
    it('debería limpiar duplicados exitosamente', async () => {
      mockDbInstance.execute.mockResolvedValue({ rowCount: 5 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedCount).toBe(5);
    });
  });

  describe('GET /admin/aum/verify/:fileId', () => {
    it('debería verificar archivo exitosamente', async () => {
      mockDbInstance.limit.mockResolvedValue([
        {
          id: 'file-123',
          totalParsed: 100,
          totalMatched: 80,
          totalUnmatched: 20,
        },
      ]);

      mockDbInstance.execute.mockResolvedValue({ rows: [{ count: 100 }] });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.verification.dbCount).toBe(100);
    });
  });
});
