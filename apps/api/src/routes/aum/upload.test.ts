/**
 * Tests para aum upload routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// AI_DECISION: Use aliases for mocks to ensure consistency with source code
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  aumImportFiles: {
    id: 'aum_import_files.id',
    broker: 'aum_import_files.broker',
    originalFilename: 'aum_import_files.original_filename',
    status: 'aum_import_files.status',
    totalParsed: 'aum_import_files.total_parsed',
    totalMatched: 'aum_import_files.total_matched',
    totalUnmatched: 'aum_import_files.total_unmatched',
    createdAt: 'aum_import_files.created_at',
    uploadedByUserId: 'aum_import_files.uploaded_by_user_id',
    fileType: 'aum_import_files.file_type',
    reportMonth: 'aum_import_files.report_month',
    reportYear: 'aum_import_files.report_year',
  },
  aumImportRows: {
    id: 'aum_import_rows.id',
    fileId: 'aum_import_rows.file_id',
    accountNumber: 'aum_import_rows.account_number',
    holderName: 'aum_import_rows.holder_name',
    idCuenta: 'aum_import_rows.id_cuenta',
  },
  teams: {},
  teamMembership: {},
  advisorAccountMapping: {},
  advisorAliases: {},
  brokerAccounts: {},
  contacts: {},
  users: {},
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
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
  inArray: vi.fn((col: unknown, vals: unknown[]) => ({ column: col, values: vals })),
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
  canAccessAumFile: vi.fn().mockResolvedValue(true),
  getUserAccessScope: vi.fn().mockResolvedValue({
    userId: 'user-123',
    role: 'admin',
    accessibleAdvisorIds: [],
    canSeeUnassigned: true,
    canAssignToOthers: true,
    canReassign: true,
  }),
}));

vi.mock('@/utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('@/services/aum-parser', () => ({
  parseAumFile: vi.fn(),
}));

vi.mock('@/services/aum', () => ({
  matchContactByAccountNumber: vi.fn(),
  matchContactByHolderName: vi.fn(),
  matchAdvisor: vi.fn(),
  upsertAumRows: vi.fn(),
  applyAdvisorAccountMapping: vi.fn().mockResolvedValue({}),
  upsertAumMonthlySnapshots: vi.fn(),
}));

vi.mock('@/services/aum-conflict-resolution', () => ({
  inheritAdvisorFromExisting: vi.fn((val) => val),
  inheritMatchedUserIdFromExisting: vi.fn(() => null),
  shouldFlagConflict: vi.fn(() => false),
}));

vi.mock('@/utils/aum/aum-file-detection', () => ({
  detectAumFileMetadata: vi.fn(() => ({ fileType: 'master' })),
}));

vi.mock('@/utils/aum/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string) => value.replace(/\D+/g, '')),
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock('@/config/aum-limits', () => ({
  AUM_LIMITS: {
    MAX_FILE_SIZE: 25 * 1024 * 1024,
    PREVIEW_LIMIT: 500,
  },
}));

vi.mock('multer', () => {
  const MulterError = class MulterError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'MulterError';
    }
  };

  const mockDiskStorage = vi.fn(() => ({}));
  const mockMemoryStorage = vi.fn(() => ({}));
  const mockMulter = vi.fn(() => ({
    single: vi.fn(() => (req: Request, _res: Response, next: NextFunction) => {
      (req as any).file = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 100,
        path: '/tmp/test.csv',
        buffer: Buffer.from('test'),
      };
      next();
    }),
    array: vi.fn(() => vi.fn()),
    fields: vi.fn(() => vi.fn()),
    any: vi.fn(() => vi.fn()),
    none: vi.fn(() => vi.fn()),
  }));

  (mockMulter as any).diskStorage = mockDiskStorage;
  (mockMulter as any).memoryStorage = mockMemoryStorage;
  (mockMulter as any).MulterError = MulterError;

  return {
    default: mockMulter,
    diskStorage: mockDiskStorage,
    memoryStorage: mockMemoryStorage,
    MulterError,
  };
});

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import components after mocks
import uploadRouter from './upload/index';
import { db } from '@maatwork/db';
import { parseAumFile } from '@/services/aum-parser';
import { upsertAumRows } from '@/services/aum';

const mockDb = vi.mocked(db);
const mockParseAumFile = vi.mocked(parseAumFile);
const mockUpsertAumRows = vi.mocked(upsertAumRows);

describe('AUM Upload Routes', () => {
  const createTestAppWithRoutes = () => {
    console.log('DEBUG uploadRouter:', uploadRouter);
    console.log('DEBUG uploadRouter keys:', Object.keys(uploadRouter || {}));
    return createTestApp([
      { path: '/admin/aum', router: (uploadRouter as any).default || uploadRouter },
    ]);
  };

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
  });

  describe('POST /admin/aum/uploads', () => {
    it('debería subir archivo exitosamente', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            holderName: 'Juan Perez',
            advisorRaw: 'advisor@example.com',
            aumDollars: 1000,
            raw: {},
          },
        ],
      });

      mockUpsertAumRows.mockResolvedValue({
        success: true,
        stats: {
          inserted: 1,
          updated: 0,
          errors: 0,
          updatedOnlyHolderName: 0,
        },
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'file-123',
              broker: 'balanz',
              originalFilename: 'test.csv',
              status: 'parsed',
              totalParsed: 1,
              totalMatched: 1,
              totalUnmatched: 0,
            },
          ]),
        }),
      });

      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{ total: 1, matched: 1, ambiguous: 0, conflicts: 0 }],
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        execute: mockExecute,
      } as unknown as ReturnType<typeof db>);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test content'), 'test.csv')
        .expect(201);

      expect(res.body.ok).toBe(true);
      expect(res.body.fileId).toBe('file-123');
    });

    it('debería retornar error cuando parse falla', async () => {
      mockParseAumFile.mockResolvedValue({
        success: false,
        error: 'Parse error',
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'file-123' }]),
        }),
      });
      mockDb.mockReturnValue({ insert: mockInsert } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('invalid content'), 'test.csv')
        .expect(400);

      expect(res.body.error).toBe('Error al procesar el archivo');
      expect(res.body.details).toBe('Parse error');
    });
  });

  describe('GET /admin/aum/uploads/:fileId/preview', () => {
    it('debería retornar preview exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                originalFilename: 'test.csv',
                status: 'parsed',
                totalParsed: 1,
                totalMatched: 1,
                totalUnmatched: 0,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      });

      const mockSelectRows = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'row-1',
                accountNumber: '12345',
                holderName: 'Juan Perez',
              },
            ]),
          }),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { select: mockSelect } as any;
        return { select: mockSelectRows } as any;
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/uploads/file-123/preview')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);
      expect(res.body.data.rows).toHaveLength(1);
    });
  });

  describe('GET /admin/aum/uploads/history', () => {
    it('debería listar historial exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'file-123',
              broker: 'balanz',
              originalFilename: 'test.csv',
              status: 'parsed',
            },
          ]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/uploads/history')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);
      expect(res.body.data.files).toHaveLength(1);
    });
  });
});
