/**
 * Tests para aum commit routes
 *
 * AI_DECISION: Tests unitarios para endpoints de commit AUM
 * Justificación: Validación crítica de commit de datos AUM a broker_accounts
 * Impacto: Prevenir errores en sincronización de datos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import commitRouter from './commit';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportFiles: {},
  aumImportRows: {},
  brokerAccounts: {},
  contacts: {},
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../auth/authorization', () => ({
  canAccessAumFile: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../utils/db-transactions', () => ({
  transactionWithLogging: vi.fn(),
}));

vi.mock('../../utils/error-response', () => ({
  createErrorResponse: vi.fn(({ error, userMessage }) => ({
    error: userMessage || (error instanceof Error ? error.message : String(error)),
  })),
}));

import { db } from '@cactus/db';
import { aumImportFiles, aumImportRows, brokerAccounts, contacts, eq, and } from '@cactus/db';
import { canAccessAumFile } from '../../auth/authorization';
import { transactionWithLogging } from '../../utils/db-transactions';

const mockDb = vi.mocked(db);
const mockCanAccessAumFile = vi.mocked(canAccessAumFile);
const mockTransactionWithLogging = vi.mocked(transactionWithLogging);

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
    mockCanAccessAumFile.mockResolvedValue(true);
  });

  describe('POST /admin/aum/uploads/:fileId/commit', () => {
    it('debería commitear archivo exitosamente', async () => {
      const mockSelectFile = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                status: 'parsed',
              },
            ]),
          }),
        }),
      });

      const mockSelectAmbiguous = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const mockSelectRows = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'row-1',
              accountNumber: '12345',
              matchedContactId: 'contact-1',
              holderName: 'Juan Perez',
              matchedUserId: null,
              matchStatus: 'matched',
              isPreferred: true,
            },
          ]),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectFile } as any;
        }
        if (callCount === 2) {
          return { select: mockSelectAmbiguous } as any;
        }
        return { select: mockSelectRows } as any;
      });

      mockTransactionWithLogging.mockImplementation(async (log, name, callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return await callback(mockTx as any);
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        upserts: expect.any(Number),
        skipped: expect.any(Number),
        total: expect.any(Number),
        message: expect.any(String),
      });
    });

    it('debería retornar 404 cuando archivo no existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({ error: 'File not found' });
    });

    it('debería retornar 400 cuando hay filas ambiguous', async () => {
      const mockSelectFile = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                status: 'parsed',
              },
            ]),
          }),
        }),
      });

      const mockSelectAmbiguous = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'row-1',
              matchStatus: 'ambiguous',
            },
          ]),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectFile } as any;
        }
        return { select: mockSelectAmbiguous } as any;
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'Cannot commit file with unresolved conflicts',
        details: expect.stringContaining('ambiguous'),
      });
    });

    it('debería skip rows sin accountNumber', async () => {
      const mockSelectFile = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                status: 'parsed',
              },
            ]),
          }),
        }),
      });

      const mockSelectAmbiguous = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const mockSelectRows = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'row-1',
              accountNumber: null,
              matchedContactId: 'contact-1',
              matchStatus: 'matched',
              isPreferred: true,
            },
          ]),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectFile } as any;
        }
        if (callCount === 2) {
          return { select: mockSelectAmbiguous } as any;
        }
        return { select: mockSelectRows } as any;
      });

      mockTransactionWithLogging.mockImplementation(async (log, name, callback) => {
        return await callback({} as any);
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/commit')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.skipped).toBe(1);
    });
  });

  describe('POST /admin/aum/uploads/:fileId/confirm-changes', () => {
    it('debería confirmar cambios exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                status: 'parsed',
              },
            ]),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { update: mockUpdate } as any;
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads/file-123/confirm-changes')
        .set('Cookie', `token=${adminToken}`)
        .send({
          changes: [],
        })
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: expect.any(String),
      });
    });
  });
});
