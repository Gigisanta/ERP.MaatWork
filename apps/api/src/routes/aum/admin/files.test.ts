/**
 * Tests para AUM Admin - File Management Routes
 *
 * AI_DECISION: Tests unitarios para gestión de archivos AUM
 * Justificación: Validación crítica de operaciones de archivos
 * Impacto: Prevenir errores en gestión de archivos y verificación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import filesRouter from './files';
import { signUserToken } from '../../../auth/jwt';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportFiles: {},
  aumImportRows: {},
  eq: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('../../../auth/middlewares', () => ({
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

vi.mock('../../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => {
    // Simulate Zod transformation for force query param
    if (req.query?.force === 'true') {
      (req.query as Record<string, unknown>).force = true;
    } else if (req.query?.force === 'false' || req.query?.force === undefined) {
      (req.query as Record<string, unknown>).force = false;
    }
    next();
  }),
}));

vi.mock('node:fs', () => ({
  promises: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('node:path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

import { db } from '@cactus/db';
import { aumImportFiles, aumImportRows, eq, sql } from '@cactus/db';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createTestApp } from '../../../__tests__/helpers/test-server';

const mockDb = vi.mocked(db);
const mockEq = vi.mocked(eq);
const mockSql = vi.mocked(sql);
const mockFs = vi.mocked(fs);
const mockJoin = vi.mocked(join);

describe('AUM Admin - Files Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: filesRouter }]);

  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
    mockJoin.mockImplementation((...args) => args.join('/'));
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

      const mockDelete = vi.fn((_table: unknown) => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));

      mockDb.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      } as unknown);

      mockFs.unlink.mockResolvedValue(undefined);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'Archivo eliminado exitosamente',
      });
    });

    it('debería retornar 404 cuando archivo no existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Array vacío = archivo no existe
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('File not found');
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
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('Cannot delete committed import');
    });

    it('debería verificar que el handler valida usuario (auth tested via middleware)', async () => {
      // Note: The 401 check when req.user is undefined is tested via auth middleware tests
      // Here we verify the handler works correctly when user is set
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

      const mockDelete = vi.fn((_table: unknown) => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));

      mockDb.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('debería manejar error al eliminar archivo físico', async () => {
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

      const mockDelete = vi.fn((_table: unknown) => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));

      mockDb.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      } as unknown);

      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      const app = createTestAppWithRoutes();
      // Should still succeed even if physical file deletion fails
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('debería manejar errores de base de datos', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Error eliminando archivo AUM');
      expect(res.body.message).toBe('Database error');
    });
  });

  describe('DELETE /admin/aum/uploads', () => {
    it('debería purgar solo non-committed cuando force no es true', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 5 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'AUM uploads purgados (solo no committed)',
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('debería purgar todo cuando force es true', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 10 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads?force=true')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'AUM uploads purgados (incluye committed)',
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('debería manejar errores correctamente', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Purge failed'));

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/uploads')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Error purgando archivos AUM');
      expect(res.body.message).toBe('Purge failed');
    });
  });

  describe('GET /admin/aum/verify/:fileId', () => {
    it('debería verificar archivo exitosamente sin discrepancias', async () => {
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
                createdAt: new Date('2024-01-01'),
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

      mockDb.mockReturnValue({
        select: mockSelect,
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        file: {
          id: 'file-123',
          broker: 'balanz',
          originalFilename: 'test.csv',
          status: 'parsed',
          totals: {
            parsed: 100,
            matched: 80,
            unmatched: 20,
          },
          createdAt: expect.any(String),
        },
        verification: {
          dbCount: 100,
          fileTotalParsed: 100,
          discrepancy: 0,
          hasDiscrepancy: false,
          onlyHolderNameCount: 5,
          statusCounts: {
            matched: 80,
            unmatched: 20,
          },
        },
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
                createdAt: new Date('2024-01-01'),
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
          rows: [{ count: 3 }],
        })
        .mockResolvedValueOnce({
          rows: [
            { match_status: 'matched', count: 75 },
            { match_status: 'unmatched', count: 20 },
          ],
        });

      mockDb.mockReturnValue({
        select: mockSelect,
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.verification).toEqual({
        dbCount: 95,
        fileTotalParsed: 100,
        discrepancy: 5, // file.totalParsed - dbCount = 100 - 95 = 5
        hasDiscrepancy: true,
        onlyHolderNameCount: 3,
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
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('File not found');
    });

    it('debería retornar 401 cuando no hay usuario autenticado', async () => {
      // Mock requireAuth to not set req.user (simulating unauthenticated request)
      const { requireAuth: originalRequireAuth } = await import('../../../auth/middlewares');
      vi.mocked(originalRequireAuth).mockImplementationOnce((req, res, next) => {
        // Don't set req.user to simulate unauthenticated request
        next();
      });

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

      mockDb.mockReturnValue({
        select: mockSelect,
        execute: vi.fn(),
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app).get('/admin/aum/verify/file-123').expect(401);

      expect(res.body.error).toBe('Unauthorized');
    });

    it('debería manejar statusCounts vacío', async () => {
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
                totalMatched: 0,
                totalUnmatched: 0,
                createdAt: new Date('2024-01-01'),
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
          rows: [{ count: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      mockDb.mockReturnValue({
        select: mockSelect,
        execute: mockExecute,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body.verification.statusCounts).toEqual({});
    });

    it('debería manejar errores correctamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as unknown);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/admin/aum/verify/file-123')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Error verificando archivo AUM');
      expect(res.body.message).toBe('Database error');
    });
  });
});
