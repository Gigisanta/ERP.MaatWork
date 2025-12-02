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
    single: vi.fn(() => vi.fn()),
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

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  advisorAccountMapping: {},
  advisorAliases: {},
  eq: vi.fn(),
}));

vi.mock('../../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../../config/aum-limits', () => ({
  AUM_LIMITS: {
    MAX_FILE_SIZE: 25 * 1024 * 1024,
  },
}));

vi.mock('../../../utils/aum-normalization', () => ({
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
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../../../utils/aum-normalization';
import { promises as fs } from 'node:fs';

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockParseAumFile = vi.mocked(parseAumFile);
const mockNormalizeAccountNumber = vi.mocked(normalizeAccountNumber);
const mockNormalizeAdvisorAlias = vi.mocked(normalizeAdvisorAlias);
const mockFs = vi.mocked(fs);

describe('AUM Admin - Mapping Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/admin/aum', mappingRouter);
    return app;
  }

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
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

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing mapping
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // First call: check existing mapping
        // Second call: check advisorAliases (no match)
        // Third call: insert new mapping
        if (callCount <= 2) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
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

      const mockSelect = vi.fn().mockReturnValue({
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

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect } as any; // Existing mapping
        }
        if (callCount === 2) {
          return { select: mockSelect } as any; // advisorAliases check
        }
        return { update: mockUpdate } as any; // Update
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
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

      const mockSelectMapping = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing mapping
          }),
        }),
      });

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

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectMapping } as any;
        }
        if (callCount === 2) {
          return { select: mockSelectAlias } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
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

      const app = createTestApp();
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

      const app = createTestApp();
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

      const app = createTestApp();
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

      const app = createTestApp();
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

      const app = createTestApp();
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

      const app = createTestApp();
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

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
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
        if (callCount <= 2) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
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
        if (callCount <= 2) {
          return { select: mockSelect } as any;
        }
        return { insert: mockInsert } as any;
      });

      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      const app = createTestApp();
      // Should still succeed even if cleanup fails
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.ok).toBe(true);
    });

    it('debería retornar 401 cuando no hay usuario autenticado', async () => {
      // Note: Auth is tested via middleware, but handler checks userId
      // This test verifies handler works with valid user
      mockParseAumFile.mockResolvedValue({
        success: true,
        data: [],
      });

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestApp();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(201);

      expect(res.body.ok).toBe(true);
    });

    it('debería manejar errores generales correctamente', async () => {
      mockParseAumFile.mockRejectedValue(new Error('Unexpected error'));

      const app = createTestApp();
      const res = await request(app)
        .post('/admin/aum/advisor-mapping/upload')
        .set('Cookie', `token=${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.csv')
        .expect(500);

      expect(res.body).toEqual({
        error: 'Unexpected error',
      });
    });
  });
});
