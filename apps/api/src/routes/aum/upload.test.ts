/**
 * Tests para aum upload routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import uploadRouter from './upload';
import { signUserToken } from '../../auth/jwt';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportFiles: {},
  aumImportRows: {},
  teams: {},
  teamMembership: {},
  advisorAccountMapping: {},
  advisorAliases: {},
  brokerAccounts: {},
  contacts: {},
  users: {},
  eq: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../../auth/authorization', () => ({
  canAccessAumFile: vi.fn().mockResolvedValue(true),
  getUserAccessScope: vi.fn().mockResolvedValue({
    userId: 'user-123',
    role: 'admin',
    accessibleAdvisorIds: [],
    canSeeUnassigned: true,
    canAssignToOthers: true,
    canReassign: true
  })
}));

vi.mock('../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../../services/aumParser', () => ({
  parseAumFile: vi.fn()
}));

vi.mock('../../services/aumMatcher', () => ({
  matchContactByAccountNumber: vi.fn(),
  matchContactByHolderName: vi.fn(),
  matchAdvisor: vi.fn()
}));

vi.mock('../../services/aumUpsert', () => ({
  upsertAumRows: vi.fn(),
  applyAdvisorAccountMapping: vi.fn(),
  upsertAumMonthlySnapshots: vi.fn()
}));

vi.mock('../../services/aumConflictResolution', () => ({
  inheritAdvisorFromExisting: vi.fn(),
  shouldFlagConflict: vi.fn()
}));

vi.mock('../../utils/aum-file-detection', () => ({
  detectAumFileMetadata: vi.fn()
}));

vi.mock('../../utils/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string) => value.replace(/\D+/g, '')),
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase())
}));

vi.mock('../../config/aum-limits', () => ({
  AUM_LIMITS: {
    MAX_FILE_SIZE: 25 * 1024 * 1024,
    PREVIEW_LIMIT: 500
  }
}));

vi.mock('multer', () => ({
  default: vi.fn(() => ({
    single: vi.fn(() => (req, res, next) => next())
  })),
  diskStorage: vi.fn(() => ({}))
}));

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined)
  }
}));

import { db } from '@cactus/db';
import { aumImportFiles, aumImportRows } from '@cactus/db';
import { parseAumFile } from '../../services/aumParser';
import { upsertAumRows } from '../../services/aumUpsert';

const mockDb = vi.mocked(db);
const mockParseAumFile = vi.mocked(parseAumFile);
const mockUpsertAumRows = vi.mocked(upsertAumRows);

describe('AUM Upload Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/admin/aum', uploadRouter);
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

  describe('POST /admin/aum/uploads', () => {
    it('debería subir archivo exitosamente', async () => {
      const mockFile = {
        path: '/tmp/test.csv',
        originalname: 'test.csv',
        size: 1000,
        mimetype: 'text/csv'
      };

      mockParseAumFile.mockResolvedValue({
        success: true,
        value: [
          {
            accountNumber: '12345',
            holderName: 'Juan Perez',
            advisorRaw: 'advisor@example.com',
            aumDollars: 1000
          } as any
        ]
      });

      mockUpsertAumRows.mockResolvedValue({
        success: true,
        stats: {
          inserted: 1,
          updated: 0,
          errors: 0,
          updatedOnlyHolderName: 0
        }
      });

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
            id: 'file-123',
            broker: 'balanz',
            originalFilename: 'test.csv',
            status: 'parsed'
          }])
        })
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .post('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test content'), 'test.csv')
        .expect(201);

      expect(res.body).toEqual({
        ok: true,
        file: expect.objectContaining({
          id: 'file-123',
          broker: 'balanz'
        }),
        stats: expect.objectContaining({
          inserted: 1,
          updated: 0,
          errors: 0
        })
      });
    });

    it('debería retornar error cuando parse falla', async () => {
      mockParseAumFile.mockResolvedValue({
        success: false,
        error: 'Parse error'
      });

      const app = createTestApp();
      const res = await request(app)
        .post('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('invalid content'), 'test.csv')
        .expect(400);

      expect(res.body).toEqual({
        error: 'Error al procesar el archivo',
        details: 'Parse error'
      });
    });
  });

  describe('GET /admin/aum/uploads/:fileId/preview', () => {
    it('debería retornar preview exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'file-123',
              broker: 'balanz',
              originalFilename: 'test.csv'
            }])
          })
        })
      });

      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'row-1',
            account_number: '12345',
            holder_name: 'Juan Perez'
          }
        ]
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { execute: mockExecute } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/uploads/file-123/preview')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        file: expect.objectContaining({
          id: 'file-123'
        }),
        rows: expect.arrayContaining([
          expect.objectContaining({
            id: 'row-1',
            accountNumber: '12345'
          })
        ])
      });
    });
  });

  describe('GET /admin/aum/uploads/:fileId', () => {
    it('debería retornar file por ID', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'file-123',
              broker: 'balanz',
              originalFilename: 'test.csv',
              status: 'parsed'
            }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        id: 'file-123',
        broker: 'balanz',
        originalFilename: 'test.csv',
        status: 'parsed'
      });
    });
  });

  describe('GET /admin/aum/uploads', () => {
    it('debería listar uploads exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([
                  {
                    id: 'file-123',
                    broker: 'balanz',
                    originalFilename: 'test.csv',
                    status: 'parsed'
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
        .get('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'file-123',
            broker: 'balanz'
          })
        ]),
        total: expect.any(Number)
      });
    });
  });
});


