/**
 * Tests para aum rows routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import rowsRouter from './rows/index';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportRows: {},
  aumImportFiles: {},
  contacts: {},
  users: {},
  advisorAliases: {},
  aumMonthlySnapshots: {},
  eq: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../auth/authorization', () => ({
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

vi.mock('../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => {
    // Simulate Zod transformation for query params
    if (req.query.limit && typeof req.query.limit === 'string') {
      req.query.limit = Number(req.query.limit) as any;
    }
    if (req.query.offset && typeof req.query.offset === 'string') {
      req.query.offset = Number(req.query.offset) as any;
    }
    next();
  }),
}));

vi.mock('../../services/aumMatcher', () => ({
  matchContactByAccountNumber: vi.fn(),
  matchContactByHolderName: vi.fn(),
  matchAdvisor: vi.fn(),
}));

vi.mock('../../utils/aum/aum-normalization', () => ({
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase()),
}));

import { db } from '@cactus/db';
import { aumImportRows, aumImportFiles } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('AUM Rows Routes', () => {
  const createTestAppWithRoutes = () => createTestApp([{ path: '/admin/aum', router: rowsRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
  });

  describe('GET /admin/aum/rows/all', () => {
    it('debería retornar rows con paginación', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ total: 10 }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'row-1',
              file_id: 'file-1',
              account_number: '12345',
              holder_name: 'Juan Perez',
              id_cuenta: null,
              advisor_raw: null,
              matched_contact_id: null,
              matched_user_id: null,
              match_status: 'matched',
              is_preferred: false,
              conflict_detected: false,
              needs_confirmation: false,
              is_normalized: false,
              row_created_at: new Date(),
              row_updated_at: new Date(),
              current_file_id: 'file-1',
              current_file_name: 'test.csv',
              current_file_created_at: new Date(),
              file_type: 'csv',
              file_report_month: null,
              file_report_year: null,
              aum_dollars: null,
              bolsa_arg: null,
              fondos_arg: null,
              bolsa_bci: null,
              pesos: null,
              mep: null,
              cable: null,
              cv7000: null,
              broker: 'balanz',
              original_filename: 'test.csv',
              file_status: 'parsed',
              file_created_at: new Date(),
              contact_name: null,
              contact_first_name: null,
              contact_last_name: null,
              user_name: null,
              user_email: null,
              suggested_user_id: null,
            },
          ],
        });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/rows/all?limit=10&offset=0')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.rows).toBeInstanceOf(Array);
      expect(res.body.rows.length).toBeGreaterThan(0);
      expect(res.body.rows[0]).toMatchObject({
        id: 'row-1',
        accountNumber: '12345',
      });
      expect(res.body.pagination).toMatchObject({
        total: 10,
      });
      expect(typeof res.body.pagination.limit).toBe('number');
      expect(typeof res.body.pagination.offset).toBe('number');
      expect(typeof res.body.pagination.hasMore).toBe('boolean');
    });

    it('debería filtrar por broker', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ total: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/rows/all?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.pagination.total).toBe(5);
    });

    it('debería filtrar por status', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ total: 3 }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/rows/all?status=matched')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.pagination.total).toBe(3);
    });
  });

  describe('POST /admin/aum/uploads/:fileId/match', () => {
    it('debería match row exitosamente', async () => {
      const mockSelectFile = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-1',
              },
            ]),
          }),
        }),
      });

      const mockSelectRow = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                accountNumber: '12345',
              },
            ]),
          }),
        }),
      });

      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            total_parsed: 10,
            total_matched: 5,
            total_unmatched: 5,
          },
        ],
      });

      const mockUpdate = vi.fn((_table: unknown) => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }));

      let selectCallCount = 0;
      const mockSelect = vi.fn((fields?: unknown) => {
        selectCallCount++;
        // First call: select file (no arguments)
        if (selectCallCount === 1 || !fields) {
          return mockSelectFile();
        }
        // Second call (if isPreferred): select row accountNumber (with fields)
        return mockSelectRow();
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        execute: mockExecute,
        update: mockUpdate,
      } as any);

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

      expect(res.body).toEqual({
        ok: true,
      });
    });
  });
});
