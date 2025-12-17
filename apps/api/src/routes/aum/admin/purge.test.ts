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

// AI_DECISION: Usar vi.hoisted para definir mocks antes del hoisting de vi.mock
// Justificación: vi.mock se hoistea y necesita acceso a las funciones de mock
// Impacto: El mock de db retorna un objeto con métodos por defecto
const { mockExecute, mockDbInstance } = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue({ rowCount: 0 });
  const mockDbInstance = {
    execute: mockExecute,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return { mockExecute, mockDbInstance };
});

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(() => mockDbInstance),
  eq: vi.fn(),
}));

// AI_DECISION: Mock sql como tagged template function
// Justificación: El código usa sql`...` como tagged template literal
// Impacto: sql debe retornar un objeto que db().execute() pueda usar
vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    {
      raw: vi.fn((str: string) => ({ sql: str, values: [] })),
    }
  ),
  eq: vi.fn((col: unknown, val: unknown) => ({ column: col, value: val })),
}));

vi.mock('../../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';

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
      mockExecute.mockResolvedValue({ rowCount: 10 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      // AI_DECISION: createRouteHandler envuelve respuestas en { success: true, data: {...} }
      expect(res.body).toEqual({
        success: true,
        data: {
          ok: true,
          message: 'Sistema AUM/broker purgado completamente',
        },
      });
      expect(mockExecute).toHaveBeenCalledTimes(3); // broker_accounts, aum_import_rows, aum_import_files
    });

    it('debería purgar por broker cuando se especifica', async () => {
      mockExecute.mockResolvedValue({ rowCount: 5 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all?broker=balanz')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: {
          ok: true,
          message: 'Sistema AUM/broker purgado completamente',
        },
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería manejar errores correctamente', async () => {
      mockExecute.mockRejectedValue(new Error('Database error'));

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .delete('/admin/aum/purge-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      // AI_DECISION: El error handler retorna { error, message, stack }
      expect(res.body.error).toBe('An error occurred while processing your request');
      expect(res.body.message).toBe('Database error');
    });
  });

  describe('POST /admin/aum/cleanup-duplicates', () => {
    it('debería limpiar duplicados exitosamente', async () => {
      mockExecute.mockResolvedValue({ rowCount: 5 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: {
          ok: true,
          message: 'Se eliminaron 5 filas duplicadas',
          deletedCount: 5,
        },
      });
    });

    it('debería retornar 0 cuando no hay duplicados', async () => {
      mockExecute.mockResolvedValue({ rowCount: 0 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: {
          ok: true,
          message: 'Se eliminaron 0 filas duplicadas',
          deletedCount: 0,
        },
      });
    });

    it('debería permitir acceso a manager', async () => {
      mockExecute.mockResolvedValue({ rowCount: 3 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${managerToken}`)
        .expect(200);

      expect(res.body.data.ok).toBe(true);
    });

    it('debería manejar errores correctamente', async () => {
      mockExecute.mockRejectedValue(new Error('SQL error'));

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/cleanup-duplicates')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('An error occurred while processing your request');
      expect(res.body.message).toBe('SQL error');
    });
  });

  describe('POST /admin/aum/reset-all', () => {
    it('debería resetear sistema AUM exitosamente', async () => {
      mockExecute.mockResolvedValue({ rowCount: 10 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: {
          ok: true,
          message: 'Sistema AUM limpiado completamente. Listo para cargar el primer archivo.',
        },
      });
      expect(mockExecute).toHaveBeenCalledTimes(2); // aum_import_rows, aum_import_files
    });

    it('debería permitir acceso a manager', async () => {
      mockExecute.mockResolvedValue({ rowCount: 0 });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${managerToken}`)
        .expect(200);

      expect(res.body.data.ok).toBe(true);
    });

    it('debería manejar errores correctamente', async () => {
      mockExecute.mockRejectedValue(new Error('Reset failed'));

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('An error occurred while processing your request');
      expect(res.body.message).toBe('Reset failed');
    });

    it('debería manejar errores no-Error correctamente', async () => {
      mockExecute.mockRejectedValue('String error');

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .post('/admin/aum/reset-all')
        .set('Cookie', `token=${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('An error occurred while processing your request');
    });
  });
});
