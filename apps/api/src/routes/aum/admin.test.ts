/**
 * Tests para aum admin routes
 *
 * AI_DECISION: Tests unitarios para endpoints de administración AUM
 * Justificación: Validación crítica de operaciones destructivas y administración
 * Impacto: Prevenir errores en operaciones críticas de administración
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import adminRouter from './admin';
import { signUserToken } from '../../auth/jwt';
import { createTestApp } from '../../__tests__/helpers/test-server';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportFiles: {},
  aumImportRows: {},
  advisorAccountMapping: {},
  advisorAliases: {},
  eq: vi.fn(),
  sql: vi.fn(),
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

vi.mock('../../services/aumParser', () => ({
  parseAumFile: vi.fn(),
}));

vi.mock('../../utils/aum/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string) => value.replace(/\D+/g, '')),
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock('../../config/aum-limits', () => ({
  AUM_LIMITS: {
    MAX_FILE_SIZE: 25 * 1024 * 1024,
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
    single: vi.fn(() => (req, res, next) => next()),
    array: vi.fn(() => vi.fn()),
    fields: vi.fn(() => vi.fn()),
    any: vi.fn(() => vi.fn()),
    none: vi.fn(() => vi.fn()),
  }));

  // Attach diskStorage to the default export
  mockMulter.diskStorage = mockDiskStorage;
  mockMulter.memoryStorage = mockMemoryStorage;
  mockMulter.MulterError = MulterError;

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
    readFile: vi.fn().mockResolvedValue('test content'),
  },
}));

import { db } from '@cactus/db';
import { aumImportFiles, aumImportRows, eq, sql } from '@cactus/db';
import { parseAumFile } from '../../services/aumParser';
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../../utils/aum/aum-normalization';
import { promises as fs } from 'node:fs';

const mockDb = vi.mocked(db);
const mockParseAumFile = vi.mocked(parseAumFile);
const mockNormalizeAccountNumber = vi.mocked(normalizeAccountNumber);
const mockNormalizeAdvisorAlias = vi.mocked(normalizeAdvisorAlias);
const mockFs = vi.mocked(fs);

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
  });

  describe('DELETE /admin/aum/uploads/:fileId', () => {
    it('debería eliminar archivo exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                originalFilename: 'test.csv',
                status: 'parsed',
              },
            ]),
          }),
        }),
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

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ ok: true, message: 'File deleted successfully' });
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
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({ error: 'File not found' });
    });

    it('debería retornar 400 cuando archivo está committed', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                originalFilename: 'test.csv',
                status: 'committed',
              },
            ]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'Cannot delete committed import. Contact administrator if removal is necessary.',
      });
    });
  });

  describe('DELETE /admin/aum/uploads', () => {
    it('debería purgar solo non-committed cuando force no es true', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 5 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'AUM uploads purgados (solo no committed)',
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería purgar todo cuando force es true', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 10 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads?force=true')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'AUM uploads purgados (incluye committed)',
      });
    });
  });

  describe('DELETE /admin/aum/purge-all', () => {
    it('debería purgar todo el sistema AUM', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 10 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'Sistema AUM/broker purgado completamente',
      });
    });

    it('debería purgar por broker cuando se especifica', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 5 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('POST /admin/aum/cleanup-duplicates', () => {
    it('debería limpiar duplicados exitosamente', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 5 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'Se eliminaron 5 filas duplicadas',
        deletedCount: 5,
      });
    });
  });

  describe('POST /admin/aum/reset-all', () => {
    it('debería resetear sistema AUM exitosamente', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 10 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'Sistema AUM limpiado completamente. Listo para cargar el primer archivo.',
      });
    });
  });

  describe('POST /admin/aum/advisor-mapping/upload', () => {
    it('debería subir advisor mapping exitosamente', async () => {
      const mockFileContent = 'Account Number,Advisor\n12345,advisor@example.com';

      mockParseAumFile.mockResolvedValue({
        success: true,
        value: [
          {
            accountNumber: '12345',
            advisorRaw: 'advisor@example.com',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('advisor@example.com');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from(mockFileContent), 'test.csv')
        .expect(201);

      expect(res.body).toEqual({
        ok: true,
        message: 'Mapeo de asesores cargado exitosamente',
        totals: expect.objectContaining({
          inserted: expect.any(Number),
          updated: expect.any(Number),
          errors: expect.any(Number),
          total: expect.any(Number),
        }),
      });
    });
  });

  describe('GET /admin/aum/verify/:fileId', () => {
    it('debería verificar archivo exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                originalFilename: 'test.csv',
                status: 'parsed',
                totalParsed: 100,
                totalMatched: 80,
                totalUnmatched: 20,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      });

      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ count: 100 }],
        })
        .mockResolvedValueOnce({
          rows: [{ count: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [
            { match_status: 'matched', count: 80 },
            { match_status: 'unmatched', count: 20 },
          ],
        });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { execute: mockExecute } as any;
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        file: expect.objectContaining({
          id: 'file-123',
          broker: 'balanz',
        }),
        verification: expect.objectContaining({
          dbCount: 100,
          fileTotalParsed: 100,
          discrepancy: 0,
          hasDiscrepancy: false,
        }),
      });
    });

    it('debería detectar discrepancy cuando existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'file-123',
                broker: 'balanz',
                originalFilename: 'test.csv',
                status: 'parsed',
                totalParsed: 100,
                totalMatched: 80,
                totalUnmatched: 20,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      });

      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ count: 95 }],
        })
        .mockResolvedValueOnce({
          rows: [{ count: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [
            { match_status: 'matched', count: 75 },
            { match_status: 'unmatched', count: 20 },
          ],
        });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any;
        }
        return { execute: mockExecute } as any;
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.verification).toEqual({
        dbCount: 95,
        fileTotalParsed: 100,
        discrepancy: -5,
        hasDiscrepancy: true,
        onlyHolderNameCount: 5,
        statusCounts: {
          matched: 75,
          unmatched: 20,
        },
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
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({ error: 'File not found' });
    });
  });
});
