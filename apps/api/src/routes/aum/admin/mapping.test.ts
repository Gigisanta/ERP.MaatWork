/**
 * Tests para AUM Admin - Advisor Mapping Routes
 *
 * AI_DECISION: Tests unitarios para upload de advisor mapping
 * Justificación: Validación crítica de mapeo asesor-cuenta
 * Impacto: Prevenir errores en mapeo de asesores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mappingRouter from './mapping';
import { signUserToken } from '../../../auth/jwt';
import multer from 'multer';
import { createTestApp } from '../../../__tests__/helpers/test-server';

// Mock multer before importing the route
vi.mock('multer', () => {
  const MulterError = class MulterError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'MulterError';
    }
  };

  const mockDiskStorage = vi.fn((options?: { destination?: unknown; filename?: unknown }) => {
    return {
      _handleFile: vi.fn(),
      _removeFile: vi.fn(),
      ...options,
    };
  });

  const mockMemoryStorage = vi.fn(() => ({}));
  const mockMulter = vi.fn((options?: unknown) => ({
    single: vi.fn(() => (req: any, _res: any, next: any) => {
      // Provide a default file so the route can progress
      req.file = {
        path: '/tmp/mock-upload.csv',
        originalname: 'mock-upload.csv',
        size: 10,
        mimetype: 'text/csv',
      };
      next();
    }),
    array: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    fields: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    any: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    none: vi.fn(() => (_req: any, _res: any, next: any) => next()),
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

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  advisorAccountMapping: {},
  advisorAliases: {},
  eq: vi.fn(),
}));

vi.mock('../../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../../config/aum-limits', () => ({
  AUM_LIMITS: {
    MAX_FILE_SIZE: 25 * 1024 * 1024,
  },
}));

vi.mock('../../../utils/aum/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string) => value.replace(/\D+/g, '')),
  normalizeAdvisorAlias: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock('../../../services/aumParser', () => ({
  parseAumFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '@cactus/db';
import { advisorAccountMapping, advisorAliases, eq } from '@cactus/db';
import { parseAumFile } from '../../../services/aumParser';
import {
  normalizeAccountNumber,
  normalizeAdvisorAlias,
} from '../../../utils/aum/aum-normalization';
import { promises as fs } from 'node:fs';
import multer from 'multer';

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockParseAumFile = vi.mocked(parseAumFile);
const mockNormalizeAccountNumber = vi.mocked(normalizeAccountNumber);
const mockNormalizeAdvisorAlias = vi.mocked(normalizeAdvisorAlias);
const mockFs = vi.mocked(fs);

describe('AUM Admin - Mapping Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: mappingRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    // Reset multer mock to default behavior (provides file)
    vi.mocked(multer).mockReturnValue({
      single: vi.fn(() => (req: any, _res: any, next: any) => {
        req.file = {
          path: '/tmp/mock-upload.csv',
          originalname: 'mock-upload.csv',
          size: 10,
          mimetype: 'text/csv',
        };
        next();
      }),
      array: vi.fn(() => (_req: any, _res: any, next: any) => next()),
      fields: vi.fn(() => (_req: any, _res: any, next: any) => next()),
      any: vi.fn(() => (_req: any, _res: any, next: any) => next()),
      none: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    } as any);
  });

  describe('POST /admin/aum/advisor-mapping/upload', () => {
    it('debería subir advisor mapping exitosamente con inserción', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe');

      // Mock for checking existing mapping (returns empty = no existing)
      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing mapping
          }),
        }),
      });

      // Mock for checking advisorAliases (returns empty = no match)
      const mockSelectAliases = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No match
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            // First select: check existing mapping
            if (selectCallCount === 1) {
              return mockSelectExisting();
            }
            // Second select: check advisorAliases
            return mockSelectAliases();
          }),
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body).toEqual({
        ok: true,
        message: 'Mapeo de asesores cargado exitosamente',
        totals: {
          inserted: 1,
          updated: 0,
          errors: 0,
          total: 1,
        },
      });
    });

    it('debería actualizar mapping existente', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe Updated',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe updated');

      // Mock for checking existing mapping (returns existing mapping)
      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                accountNumber: '12345',
                advisorName: 'John Doe',
                advisorRaw: 'john doe',
              },
            ]), // Existing mapping
          }),
        }),
      });

      // Mock for checking advisorAliases (returns empty = no match)
      const mockSelectAliases = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No match
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            // First select: check existing mapping
            if (selectCallCount === 1) {
              return mockSelectExisting();
            }
            // Second select: check advisorAliases
            return mockSelectAliases();
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
          update: mockUpdate,
        } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.totals).toEqual({
        inserted: 0,
        updated: 1,
        errors: 0,
        total: 1,
      });
    });

    it('debería hacer match automático con advisorAliases', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe');

      // Mock for checking existing mapping (returns empty = no existing)
      const mockSelectMapping = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing mapping
          }),
        }),
      });

      // Mock for checking advisorAliases (returns match)
      const mockSelectAlias = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId: 'user-123',
                aliasNormalized: 'john doe',
              },
            ]), // Found advisor alias
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            // First select: check existing mapping
            if (selectCallCount === 1) {
              return mockSelectMapping();
            }
            // Second select: check advisorAliases
            return mockSelectAlias();
          }),
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.totals.inserted).toBe(1);
    });

    it('debería contar errores cuando accountNumber está vacío', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.totals).toEqual({
        inserted: 0,
        updated: 0,
        errors: 1,
        total: 1,
      });
    });

    it('debería retornar 400 cuando no hay archivo', async () => {
      // Mock multer to not set file
      vi.mocked(multer).mockReturnValue({
        single: vi.fn(() => (req, res, next) => {
          (req as any).file = undefined;
          next();
        }),
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'No file uploaded',
      });
    });

    it('debería retornar 400 cuando parsing falla', async () => {
      mockParseAumFile.mockResolvedValue({
        success: false,
        error: 'Invalid file format',
        details: 'File format not supported',
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(400);

      expect(res.body).toEqual({
        error: 'Error al procesar el archivo',
        details: 'Invalid file format',
      });
    });

    it('debería manejar errores de multer LIMIT_FILE_SIZE', async () => {
      const MulterError = (multer as any).MulterError;
      const error = new MulterError('File too large', 'LIMIT_FILE_SIZE');

      vi.mocked(multer).mockReturnValue({
        single: vi.fn(() => (req, res, next) => {
          next(error);
        }),
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'Error al procesar el archivo',
        details: expect.stringContaining('Archivo demasiado grande'),
      });
    });

    it('debería manejar otros errores de multer', async () => {
      const MulterError = (multer as any).MulterError;
      const error = new MulterError('Other error', 'OTHER_ERROR');

      vi.mocked(multer).mockReturnValue({
        single: vi.fn(() => (req, res, next) => {
          next(error);
        }),
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'Error al procesar el archivo',
        details: 'Error de upload: Other error',
      });
    });

    it('debería manejar errores no-MulterError', async () => {
      const error = new Error('Generic error');

      vi.mocked(multer).mockReturnValue({
        single: vi.fn(() => (req, res, next) => {
          next(error);
        }),
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body).toEqual({
        error: 'Error al procesar el archivo',
        details: 'Generic error',
      });
    });

    it('debería manejar errores de base de datos durante inserción', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe');

      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockSelectAliases = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return mockSelectExisting();
            }
            return mockSelectAliases();
          }),
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      // Should count as error but continue processing
      expect(res.body.totals.errors).toBe(1);
    });

    it('debería limpiar archivo temporal después de procesar', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe');

      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockSelectAliases = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return mockSelectExisting();
            }
            return mockSelectAliases();
          }),
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('debería manejar errores al limpiar archivo temporal', async () => {
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [
          {
            accountNumber: '12345',
            advisorRaw: 'John Doe',
          } as any,
        ],
      });

      mockNormalizeAccountNumber.mockReturnValue('12345');
      mockNormalizeAdvisorAlias.mockReturnValue('john doe');

      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockSelectAliases = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let selectCallCount = 0;
      mockDb.mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return mockSelectExisting();
            }
            return mockSelectAliases();
          }),
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      const app = createTestAppWithRoutes();
      // Should still succeed even if cleanup fails
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.ok).toBe(true);
    });

    it('debería retornar 401 cuando no hay usuario autenticado', async () => {
      // Mock requireAuth to not set req.user (simulating unauthenticated request)
      const { requireAuth: originalRequireAuth } = await import('../../../auth/middlewares');
      vi.mocked(originalRequireAuth).mockImplementationOnce((req, res, next) => {
        // Don't set req.user to simulate unauthenticated request
        next();
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(401);

      expect(res.body.error).toBe('Unauthorized');
    });

    it('debería manejar errores generales correctamente', async () => {
      // Mock parseAumFile to return error result (not reject)
      mockParseAumFile.mockResolvedValue({
        success: false,
        error: 'Unexpected error',
      });
      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(400);

      expect(res.body.error).toBe('Error al procesar el archivo');
      expect(res.body.details).toBe('Unexpected error');
    });
  });
});
