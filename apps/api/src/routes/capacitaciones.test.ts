/**
 * Tests para capacitaciones routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import capacitacionesRouter from './capacitaciones';
import { signUserToken } from '../auth/jwt';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  capacitaciones: {},
  users: {},
  eq: vi.fn(),
  and: vi.fn(),
  ilike: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../utils/db-transactions', () => ({
  transactionWithLogging: vi.fn()
}));

vi.mock('multer', () => ({
  default: vi.fn(() => ({
    single: vi.fn(() => (req, res, next) => next())
  })),
  diskStorage: vi.fn(() => ({}))
}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue('test content'),
    unlink: vi.fn().mockResolvedValue(undefined)
  }
}));

import { db } from '@cactus/db';
import { capacitaciones, eq } from '@cactus/db';
import { transactionWithLogging } from '../utils/db-transactions';

const mockDb = vi.mocked(db);
const mockTransactionWithLogging = vi.mocked(transactionWithLogging);

describe('Capacitaciones Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/capacitaciones', capacitacionesRouter);
    return app;
  }

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    });
  });

  describe('GET /capacitaciones', () => {
    it('debería listar capacitaciones exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([
                  {
                    id: 'cap-1',
                    titulo: 'Test Capacitacion',
                    tema: 'Test',
                    link: 'https://example.com',
                    fecha: new Date('2024-01-01')
                  }
                ])
              })
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/capacitaciones')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'cap-1',
            titulo: 'Test Capacitacion'
          })
        ]),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });
    });

    it('debería filtrar por tema', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/capacitaciones?tema=Test')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /capacitaciones/:id', () => {
    it('debería retornar capacitación por ID', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'cap-1',
              titulo: 'Test Capacitacion',
              tema: 'Test',
              link: 'https://example.com'
            }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        id: 'cap-1',
        titulo: 'Test Capacitacion',
        tema: 'Test',
        link: 'https://example.com'
      });
    });

    it('debería retornar 404 cuando no existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/capacitaciones/invalid-id')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({
        error: 'Capacitación not found'
      });
    });
  });

  describe('POST /capacitaciones', () => {
    it('debería crear capacitación exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'cap-1',
            titulo: 'New Capacitacion',
            tema: 'Test',
            link: 'https://example.com'
          }])
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .post('/capacitaciones')
        .set('Cookie', `token=${adminToken}`)
        .send({
          titulo: 'New Capacitacion',
          tema: 'Test',
          link: 'https://example.com'
        })
        .expect(201);

      expect(res.body).toEqual({
        id: 'cap-1',
        titulo: 'New Capacitacion',
        tema: 'Test',
        link: 'https://example.com'
      });
    });
  });

  describe('PUT /capacitaciones/:id', () => {
    it('debería actualizar capacitación exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'cap-1',
              titulo: 'Old Title'
            }])
          })
        })
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'cap-1',
              titulo: 'Updated Title'
            }])
          })
        })
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { update: mockUpdate } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .put('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .send({
          titulo: 'Updated Title'
        })
        .expect(200);

      expect(res.body).toEqual({
        id: 'cap-1',
        titulo: 'Updated Title'
      });
    });
  });

  describe('DELETE /capacitaciones/:id', () => {
    it('debería eliminar capacitación exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'cap-1'
            }])
          })
        })
      });

      const mockDelete = vi.fn().mockResolvedValue(undefined);

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { delete: mockDelete } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .delete('/capacitaciones/cap-1')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: expect.any(String)
      });
    });
  });
});








