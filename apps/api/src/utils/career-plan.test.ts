/**
 * Tests para career-plan utils
 * 
 * AI_DECISION: Tests unitarios para cálculo de progreso de carrera
 * Justificación: Validación crítica de cálculos de producción y niveles
 * Impacto: Prevenir errores en cálculo de progreso
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, careerPlanLevels, contactTags, contacts, tags, users, teamMembership, teams } from '@cactus/db';
import {
  calculateUserAnnualProduction,
  determineUserLevel,
  calculateProgressPercentage,
  getNextLevel,
  calculateUserCareerProgress
} from './career-plan';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  careerPlanLevels: {},
  contactTags: {},
  contacts: {},
  tags: {},
  users: {},
  teamMembership: {},
  teams: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNotNull: vi.fn(),
  sql: vi.fn(),
  inArray: vi.fn()
}));

const mockDb = vi.mocked(db);

describe('calculateUserAnnualProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería calcular producción anual para advisor', async () => {
    const mockResult = [{ totalMonthlyPremium: 10000 }];
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockResult)
          })
        })
      })
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const result = await calculateUserAnnualProduction('user-123', 'advisor');

    expect(result).toBe(120000);
  });

  it('debería incluir miembros del equipo para manager', async () => {
    const mockTeamMembers = [{ id: 'user-2' }, { id: 'user-3' }];
    const mockSelect = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockTeamMembers)
            })
          })
        })
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ totalMonthlyPremium: 20000 }])
            })
          })
        })
      });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const result = await calculateUserAnnualProduction('user-123', 'manager');

    expect(result).toBe(240000);
  });
});

describe('determineUserLevel', () => {
  it('debería retornar nivel más alto alcanzado', async () => {
    const levels = [
      { id: 'level-1', levelNumber: 1, annualGoalUsd: 100000, isActive: true },
      { id: 'level-2', levelNumber: 2, annualGoalUsd: 200000, isActive: true },
      { id: 'level-3', levelNumber: 3, annualGoalUsd: 300000, isActive: true }
    ];

    const result = await determineUserLevel(250000, levels);
    expect(result).toEqual(levels[1]);
  });

  it('debería retornar null cuando no alcanza ningún nivel', async () => {
    const levels = [
      { id: 'level-1', levelNumber: 1, annualGoalUsd: 100000, isActive: true }
    ];

    const result = await determineUserLevel(50000, levels);
    expect(result).toBeNull();
  });

  it('debería filtrar niveles inactivos', async () => {
    const levels = [
      { id: 'level-1', levelNumber: 1, annualGoalUsd: 100000, isActive: true },
      { id: 'level-2', levelNumber: 2, annualGoalUsd: 200000, isActive: false },
      { id: 'level-3', levelNumber: 3, annualGoalUsd: 300000, isActive: true }
    ];

    const result = await determineUserLevel(250000, levels);
    expect(result).toEqual(levels[0]);
  });
});

describe('calculateProgressPercentage', () => {
  it('debería calcular porcentaje correctamente', () => {
    expect(calculateProgressPercentage(50000, 100000)).toBe(50);
  });

  it('debería retornar 0 cuando goal es 0', () => {
    expect(calculateProgressPercentage(50000, 0)).toBe(0);
  });

  it('debería redondear a 2 decimales', () => {
    const result = calculateProgressPercentage(33333, 100000);
    expect(result).toBe(33.33);
  });

  it('debería permitir porcentajes mayores a 100', () => {
    expect(calculateProgressPercentage(150000, 100000)).toBeGreaterThan(100);
  });
});

describe('getNextLevel', () => {
  it('debería retornar siguiente nivel', async () => {
    const currentLevel = { id: 'level-1', levelNumber: 1, isActive: true };
    const levels = [
      currentLevel,
      { id: 'level-2', levelNumber: 2, isActive: true },
      { id: 'level-3', levelNumber: 3, isActive: true }
    ];

    const result = await getNextLevel(currentLevel, levels);
    expect(result).toEqual(levels[1]);
  });

  it('debería retornar nivel más bajo cuando no hay nivel actual', async () => {
    const levels = [
      { id: 'level-1', levelNumber: 1, isActive: true },
      { id: 'level-2', levelNumber: 2, isActive: true }
    ];

    const result = await getNextLevel(null, levels);
    expect(result).toEqual(levels[0]);
  });

  it('debería retornar null cuando no hay siguiente nivel', async () => {
    const currentLevel = { id: 'level-3', levelNumber: 3, isActive: true };
    const levels = [
      { id: 'level-1', levelNumber: 1, isActive: true },
      { id: 'level-2', levelNumber: 2, isActive: true },
      currentLevel
    ];

    const result = await getNextLevel(currentLevel, levels);
    expect(result).toBeNull();
  });
});

describe('calculateUserCareerProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería calcular progreso completo del usuario', async () => {
    const mockLevels = [
      { id: 'level-1', levelNumber: 1, annualGoalUsd: 100000, isActive: true },
      { id: 'level-2', levelNumber: 2, annualGoalUsd: 200000, isActive: true }
    ];

    const mockSelect = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockLevels)
          })
        })
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ totalMonthlyPremium: 10000 }])
            })
          })
        })
      });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const result = await calculateUserCareerProgress('user-123', 'advisor');

    expect(result).toHaveProperty('currentLevel');
    expect(result).toHaveProperty('annualProduction');
    expect(result).toHaveProperty('progressPercentage');
    expect(result).toHaveProperty('nextLevel');
    expect(result.annualProduction).toBe(120000);
  });
});

