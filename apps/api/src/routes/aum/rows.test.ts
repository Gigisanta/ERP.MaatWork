/**
 * Tests para aum rows routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import rowsRouter from './rows';
import { signUserToken } from '../../auth/jwt';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportRows: {},
  aumImportFiles: {},
  contacts: {},
  users: {},
  advisorAliases: {},
  aumMonthlySnapshots: {},
  eq: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../../auth/authorization', () => ({
  getUserAccessScope: vi.fn().mockResolvedValue({
    userId: 'user-123',
    role: 'admin',
    accessibleAdvisorIds: [],
    canSeeUnassigned: true,
    canAssignToOthers: true,
    canReassign: true
  }),
  buildContactAccessFilter: vi.fn().mockReturnValue({
    whereClause: { sql: '1=1' },
    description: 'admin access'
  })
}));

vi.mock('../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../../services/aumMatcher', () => ({
  matchContactByAccountNumber: vi.fn(),
  matchContactByHolderName: vi.fn(),
  matchAdvisor: vi.fn()
}));

vi.mock('../../utils/aum-normalization', () => ({
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase())
}));

import { db } from '@cactus/db';
import { aumImportRows, aumImportFiles } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('AUM Rows Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/admin/aum', rowsRouter);
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

  describe('GET /admin/aum/rows/all', () => {
    it('debería retornar rows con paginación', async () => {
      const mockExecute = vi.fn()
        .mockResolvedValueOnce({
          rows: [{ total: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'row-1',
              account_number: '12345',
              holder_name: 'Juan Perez',
              match_status: 'matched'
            }
          ]
        });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/rows/all?limit=10&offset=0')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'row-1',
            accountNumber: '12345'
          })
        ]),
        total: 10,
        limit: 10,
        offset: 0
      });
    });

    it('debería filtrar por broker', async () => {
      const mockExecute = vi.fn()
        .mockResolvedValueOnce({
          rows: [{ total: 5 }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/rows/all?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.total).toBe(5);
    });

    it('debería filtrar por status', async () => {
      const mockExecute = vi.fn()
        .mockResolvedValueOnce({
          rows: [{ total: 3 }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/rows/all?status=matched')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.total).toBe(3);
    });
  });

  describe('GET /admin/aum/rows/:rowId', () => {
    it('debería retornar row por ID', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'row-1',
          account_number: '12345',
          holder_name: 'Juan Perez'
        }]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/rows/row-1')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        id: 'row-1',
        accountNumber: '12345',
        holderName: 'Juan Perez'
      });
    });

    it('debería retornar 404 cuando row no existe', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/rows/invalid-row')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({
        error: 'Row not found'
      });
    });
  });

  describe('PATCH /admin/aum/rows/:rowId/match', () => {
    it('debería match row exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'row-1',
              account_number: '12345'
            }])
          })
        })
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
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
        .patch('/admin/aum/rows/row-1/match')
        .set('Cookie', `token=${adminToken}`)
        .send({
          contactId: 'contact-1',
          userId: 'user-1'
        })
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: expect.any(String)
      });
    });
  });
});



