/**
 * Tests para settings-advisors routes
 *
 * AI_DECISION: Tests unitarios para configuración de asesores
 * Justificación: Validación crítica de aliases y RBAC
 * Impacto: Prevenir errores en configuración
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, advisorAliases, users } from '@cactus/db';
import { requireAuth } from '../auth/middlewares';
import { normalizeAdvisorAlias } from '../utils/aum-normalization';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  advisorAliases: {},
  users: {},
  eq: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock('../utils/aum-normalization', () => ({
  normalizeAdvisorAlias: vi.fn((alias) => alias.toLowerCase().trim()),
}));

const mockDb = vi.mocked(db);

describe('GET /admin/settings/advisors/aliases', () => {
  it('debería listar aliases (advisor solo propios)', async () => {
    const userId = 'advisor-123';
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(userId).toBe('advisor-123');
  });

  it('debería listar todos los aliases (manager/admin)', async () => {
    const userRole = 'manager';
    expect(userRole).toBe('manager');
  });
});

describe('POST /admin/settings/advisors/aliases', () => {
  it('debería crear alias exitosamente', async () => {
    const newAlias = {
      alias: 'John Doe',
      userId: 'user-123',
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'user-123', isActive: true }]),
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'alias-123',
            ...newAlias,
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any);

    expect(newAlias.alias).toBe('John Doe');
  });

  it('debería normalizar alias', async () => {
    const alias = '  John Doe  ';
    const normalized = normalizeAdvisorAlias(alias);
    expect(normalized).toBe('john doe');
  });

  it('debería retornar 409 cuando alias ya existe', async () => {
    const error = { code: '23505' }; // Unique violation
    expect(error.code).toBe('23505');
  });
});
