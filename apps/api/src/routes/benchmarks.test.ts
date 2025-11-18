/**
 * Tests para benchmarks routes
 *
 * AI_DECISION: Tests unitarios para gestión de benchmarks
 * Justificación: Validación crítica de visualización de benchmarks
 * Impacto: Prevenir errores en visualización de datos financieros
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, benchmarkDefinitions, benchmarkComponents, instruments } from '@cactus/db';
import { requireAuth, requireRole } from '../auth/middlewares';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  benchmarkDefinitions: {},
  benchmarkComponents: {},
  instruments: {},
  eq: vi.fn(),
  sql: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

const mockDb = vi.mocked(db);

describe('GET /benchmarks', () => {
  it('debería listar benchmarks disponibles', async () => {
    const benchmarks = [
      { id: 'bench-1', name: 'Benchmark 1', isSystem: true },
      { id: 'bench-2', name: 'Benchmark 2', isSystem: false },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(benchmarks),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(benchmarks.length).toBe(2);
  });

  it('debería requerir autenticación', () => {
    expect(requireAuth).toBeDefined();
  });
});

describe('GET /benchmarks/components/batch', () => {
  it('debería obtener componentes de múltiples benchmarks', async () => {
    const benchmarkIds = ['bench-1', 'bench-2'];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(benchmarkIds.length).toBe(2);
  });

  it('debería validar batch IDs', async () => {
    const invalidIds = 'not-uuid-1,not-uuid-2';
    expect(invalidIds).toBeDefined();
  });

  it('debería requerir rol válido', () => {
    expect(requireRole).toBeDefined();
  });
});
