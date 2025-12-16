/**
 * Tests para AUM Admin - Purge Operations Routes
 *
 * AI_DECISION: Tests unitarios para operaciones destructivas de purge
 * Justificación: Validación crítica de operaciones destructivas
 * Impacto: Prevenir errores en operaciones críticas de limpieza
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import purgeRouter from './purge';
import { signUserToken } from '../../../auth/jwt';
import { createTestApp } from '../../../__tests__/helpers/test-server';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  eq: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('../../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

import { db } from '@cactus/db';
import { sql } from '@cactus/db';

const mockDb = vi.mocked(db);
const mockSql = vi.mocked(sql);

describe('AUM Admin - Purge Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/admin/aum', router: purgeRouter }]);

  let adminToken: string;
  let managerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signUserToken({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
    managerToken = await signUserToken({
      id: 'manager-123',
      email: 'manager@example.com',
      role: 'manager',
    });
  });

  describe('DELETE /admin/aum/purge-all', () => {
    it('debería purgar todo el sistema AUM sin broker especificado', async () => {
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
      expect(mockExecute).toHaveBeenCalledTimes(3); // broker_accounts, aum_import_rows, aum_import_files
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

      expect(res.body).toEqual({
        ok: true,
        message: 'Sistema AUM/broker purgado completamente',
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería manejar errores correctamente', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Database error'));

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body).toEqual({
        error: 'Database error',
      });
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

    it('debería retornar 0 cuando no hay duplicados', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 0 });

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
        message: 'Se eliminaron 0 filas duplicadas',
        deletedCount: 0,
      });
    });

    it('debería permitir acceso a manager', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 3 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${managerToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('debería manejar errores correctamente', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('SQL error'));

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body).toEqual({
        error: 'SQL error',
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
      expect(mockExecute).toHaveBeenCalledTimes(2); // aum_import_rows, aum_import_files
    });

    it('debería permitir acceso a manager', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowCount: 0 });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${managerToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('debería manejar errores correctamente', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Reset failed'));

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body).toEqual({
        error: 'Reset failed',
      });
    });

    it('debería manejar errores no-Error correctamente', async () => {
      const mockExecute = vi.fn().mockRejectedValue('String error');

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body).toEqual({
        error: 'String error',
      });
    });
  });
});
