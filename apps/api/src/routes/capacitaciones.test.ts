import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signUserToken } from '../auth/jwt';
import { createTestApp } from '../__tests__/helpers/test-server';

// AI_DECISION: Mock db globally to avoid issues with ESM/monorepo resolution
vi.mock('@maatwork/db', () => {
  const mockDb = vi.fn();
  return {
    db: mockDb,
    capacitaciones: {
      id: 'id',
      titulo: 'titulo',
      tema: 'tema',
      link: 'link',
      fecha: 'fecha',
      createdByUserId: 'createdByUserId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    users: { id: 'id' },
  };
});

// Mock other dependencies
vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
      as: vi.fn((alias: string) => ({ sql: strings.join('?'), values, alias })),
    }),
    {
      raw: vi.fn((str: string) => ({
        sql: str,
        values: [],
        as: vi.fn((alias: string) => ({ sql: str, values: [], alias })),
      })),
    }
  ),
  eq: vi.fn((col: unknown, val: unknown) => ({ column: col, value: val })),
  and: vi.fn((...conditions: unknown[]) => ({ and: conditions })),
  ilike: vi.fn((col: unknown, pattern: unknown) => ({ ilike: { col, pattern } })),
  or: vi.fn((...conditions: unknown[]) => ({ or: conditions })),
  desc: vi.fn((col: unknown) => ({ desc: col })),
  asc: vi.fn((col: unknown) => ({ asc: col })),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../utils/database/db-transactions', () => ({
  transactionWithLogging: vi.fn(),
}));

vi.mock('multer', () => {
  const mockDiskStorage = vi.fn(() => ({
    _handleFile: vi.fn(),
    _removeFile: vi.fn(),
  }));
  const mockMulter = vi.fn(() => ({
    single: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
    array: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
    fields: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
    any: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
    none: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
  }));
  mockMulter.diskStorage = mockDiskStorage;
  mockMulter.memoryStorage = vi.fn(() => ({}));
  return {
    default: mockMulter,
    diskStorage: mockDiskStorage,
    memoryStorage: vi.fn(() => ({})),
  };
});

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue('test content'),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
import { db } from '@maatwork/db';
import capacitacionesRouter from './capacitaciones';

const mockDb = vi.mocked(db);

describe('Capacitaciones Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/capacitaciones', router: capacitacionesRouter }]);

  let adminToken: string;
  let mockDbObj: ReturnType<typeof db>;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    mockDbObj = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockDb.mockImplementation(() => mockDbObj);
  });

  describe('GET /capacitaciones', () => {
    it('debería listar capacitaciones exitosamente', async () => {
      const mockResult = [
        {
          id: 'cap-1',
          titulo: 'Test Capacitacion',
          tema: 'Test',
          link: 'https://example.com',
          fecha: new Date('2024-01-01'),
          total: 1,
        },
      ];

      mockDbObj.offset.mockResolvedValue(mockResult);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/capacitaciones')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cap-1',
            titulo: 'Test Capacitacion',
          }),
        ])
      );
    });

    it('debería filtrar por tema', async () => {
      mockDbObj.offset.mockResolvedValue([]);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/capacitaciones?tema=Test')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
    });
  });

  describe('GET /capacitaciones/:id', () => {
    it('debería retornar capacitación por ID', async () => {
      const mockResult = [
        {
          id: 'cap-1',
          titulo: 'Test Capacitacion',
          tema: 'Test',
          link: 'https://example.com',
        },
      ];

      mockDbObj.limit.mockResolvedValue(mockResult);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: 'cap-1',
          titulo: 'Test Capacitacion',
        })
      );
    });

    it('debería retornar 404 cuando no existe', async () => {
      mockDbObj.limit.mockResolvedValue([]);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/capacitaciones/invalid-id')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      // AI_DECISION: createErrorResponse doesn't include success: false
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /capacitaciones', () => {
    it('debería crear capacitación exitosamente', async () => {
      const mockResult = [
        {
          id: 'cap-1',
          titulo: 'New Capacitacion',
          tema: 'Test',
          link: 'https://example.com',
        },
      ];

      mockDbObj.returning.mockResolvedValue(mockResult);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/capacitaciones')
        .set('Cookie', `token=${adminToken}`)
        .send({
          titulo: 'New Capacitacion',
          tema: 'Test',
          link: 'https://example.com',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: 'cap-1',
          titulo: 'New Capacitacion',
        })
      );
    });
  });

  describe('PUT /capacitaciones/:id', () => {
    it('debería actualizar capacitación exitosamente', async () => {
      const mockExisting = [
        {
          id: 'cap-1',
          titulo: 'Old Title',
        },
      ];
      const mockUpdated = [
        {
          id: 'cap-1',
          titulo: 'Updated Title',
        },
      ];

      mockDbObj.limit.mockResolvedValue(mockExisting);
      mockDbObj.returning.mockResolvedValue(mockUpdated);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .put('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .send({
          titulo: 'Updated Title',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: 'cap-1',
          titulo: 'Updated Title',
        })
      );
    });
  });

  describe('DELETE /capacitaciones/:id', () => {
    it('debería eliminar capacitación exitosamente', async () => {
      const mockExisting = [
        {
          id: 'cap-1',
        },
      ];

      // Reset mockDbObj.where to be more flexible
      mockDbObj.where.mockReturnThis();
      // First call (SELECT): returns Promise resolving to mockExisting
      mockDbObj.limit.mockResolvedValue(mockExisting);
      // Second call (DELETE): the where() call is awaited and should resolve to something
      // Actually, db().delete().where() returns a Promise.
      // So the SECOND call to where() should return a Promise.

      mockDbObj.where
        .mockReturnValueOnce(mockDbObj) // select chain: return this for .limit()
        .mockResolvedValueOnce(undefined); // delete chain: return promise for await

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: 'cap-1',
          deleted: true,
        })
      );
    });
  });
});
