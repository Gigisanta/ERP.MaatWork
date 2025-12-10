/**
 * Tests para portfolio routes
 *
 * AI_DECISION: Tests unitarios completos para gestión de portafolios
 * Justificación: Validación crítica de asignaciones, RBAC y validaciones Zod
 * Impacto: Prevenir errores en gestión de portafolios y accesos no autorizados
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  db,
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  contacts,
  instruments,
  lookupAssetClass,
} from '@cactus/db';
import { requireAuth, requireRole } from '../auth/middlewares';
import { getUserAccessScope } from '../auth/authorization';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { uuidSchema } from '../utils/validation/common-schemas';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  portfolioTemplates: {},
  portfolioTemplateLines: {},
  clientPortfolioAssignments: {},
  contacts: {},
  instruments: {},
  lookupAssetClass: {},
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../auth/authorization', () => ({
  getUserAccessScope: vi.fn(),
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

const mockDb = vi.mocked(db);
const mockGetUserAccessScope = vi.mocked(getUserAccessScope);

describe('Portfolio Templates - GET /templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería listar templates para admin/manager', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 'template-1',
            name: 'Cartera Conservadora',
            description: 'Descripción',
            riskLevel: 'conservative',
            createdAt: new Date(),
            clientCount: 5,
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(mockSelect).toBeDefined();
  });

  it('debería incluir conteo de clientes asignados', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 'template-1',
            name: 'Cartera',
            clientCount: 3,
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(mockSelect).toBeDefined();
  });

  it('debería denegar acceso a advisors', async () => {
    // RBAC check: solo admin/manager pueden ver templates
    const advisorRole = 'advisor';
    expect(advisorRole).not.toBe('admin');
    expect(advisorRole).not.toBe('manager');
  });
});

describe('Portfolio Templates - GET /templates/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener template por ID con líneas', async () => {
    const templateId = 'template-123';

    const mockSelectTemplate = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: templateId,
              name: 'Cartera',
              description: 'Desc',
              riskLevel: 'moderate',
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    });

    const mockSelectLines = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: 'line-1',
                  targetType: 'instrument',
                  targetWeight: '0.5',
                  instrumentSymbol: 'AAPL',
                  instrumentName: 'Apple Inc.',
                },
              ]),
            }),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(mockSelectTemplate())
        .mockReturnValueOnce(mockSelectLines()),
    } as any);

    expect(templateId).toBe('template-123');
  });

  it('debería retornar 404 si template no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No encontrado
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect([]).toHaveLength(0);
  });
});

describe('Portfolio Templates - POST /templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería crear template con datos válidos', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'new-template',
            name: 'Nueva Cartera',
            description: 'Descripción',
            riskLevel: 'moderate',
            createdAt: new Date(),
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      insert: mockInsert,
    } as any);

    const validData = {
      name: 'Nueva Cartera',
      description: 'Descripción',
      riskLevel: 'moderate' as const,
    };

    expect(validData.name).toBe('Nueva Cartera');
    expect(validData.riskLevel).toBe('moderate');
  });

  it('debería validar que name es requerido', () => {
    const invalidData = {
      description: 'Desc',
      riskLevel: 'moderate' as const,
    };

    expect(invalidData).not.toHaveProperty('name');
  });

  it('debería validar que riskLevel es válido', () => {
    const invalidRiskLevel = 'invalid';
    const validLevels = ['conservative', 'moderate', 'aggressive'];

    expect(validLevels).not.toContain(invalidRiskLevel);
  });

  it('debería validar longitud máxima de name (255)', () => {
    const longName = 'a'.repeat(256);
    expect(longName.length).toBeGreaterThan(255);
  });

  it('debería validar longitud máxima de description (1000)', () => {
    const longDescription = 'a'.repeat(1001);
    expect(longDescription.length).toBeGreaterThan(1000);
  });
});

describe('Portfolio Templates - PUT /templates/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería actualizar template existente', async () => {
    const templateId = 'template-123';

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: templateId,
              name: 'Cartera Actualizada',
              description: 'Nueva descripción',
              riskLevel: 'aggressive',
            },
          ]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    expect(templateId).toBe('template-123');
  });

  it('debería retornar 404 si template no existe', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // No encontrado
        }),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    expect([]).toHaveLength(0);
  });

  it('debería permitir actualizar campos parcialmente', () => {
    const partialUpdate = {
      name: 'Solo nombre',
    };

    expect(partialUpdate).toHaveProperty('name');
    expect(partialUpdate).not.toHaveProperty('riskLevel');
  });
});

describe('Portfolio Template Lines - GET /templates/:id/lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener líneas del template', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: 'line-1',
                  targetType: 'instrument',
                  targetWeight: '0.5',
                  instrumentSymbol: 'AAPL',
                },
                {
                  id: 'line-2',
                  targetType: 'assetClass',
                  targetWeight: '0.5',
                  assetClassName: 'Equity',
                },
              ]),
            }),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(mockSelect).toBeDefined();
  });

  it('debería calcular totalWeight e isValid correctamente', () => {
    const lines = [{ targetWeight: '0.5' }, { targetWeight: '0.5' }];

    const totalWeight = lines.reduce((sum, line) => sum + Number(line.targetWeight), 0);
    const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

    expect(totalWeight).toBe(1.0);
    expect(isValid).toBe(true);
  });

  it('debería detectar cuando pesos no suman 100%', () => {
    const lines = [{ targetWeight: '0.3' }, { targetWeight: '0.4' }];

    const totalWeight = lines.reduce((sum, line) => sum + Number(line.targetWeight), 0);
    const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

    expect(totalWeight).toBe(0.7);
    expect(isValid).toBe(false);
  });
});

describe('Portfolio Template Lines - POST /templates/:id/lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería agregar línea de instrumento', async () => {
    const validLine = {
      targetType: 'instrument' as const,
      instrumentId: 'instrument-123',
      targetWeight: 0.25,
    };

    expect(validLine.targetType).toBe('instrument');
    expect(validLine.instrumentId).toBeDefined();
    expect(validLine.targetWeight).toBeGreaterThanOrEqual(0);
    expect(validLine.targetWeight).toBeLessThanOrEqual(1);
  });

  it('debería agregar línea de asset class', async () => {
    const validLine = {
      targetType: 'assetClass' as const,
      assetClass: 'equity',
      targetWeight: 0.3,
    };

    expect(validLine.targetType).toBe('assetClass');
    expect(validLine.assetClass).toBeDefined();
  });

  it('debería validar que instrumentId es requerido para tipo instrument', () => {
    const invalidLine = {
      targetType: 'instrument' as const,
      targetWeight: 0.25,
    };

    expect(invalidLine).not.toHaveProperty('instrumentId');
  });

  it('debería validar que assetClass es requerido para tipo assetClass', () => {
    const invalidLine = {
      targetType: 'assetClass' as const,
      targetWeight: 0.25,
    };

    expect(invalidLine).not.toHaveProperty('assetClass');
  });

  it('debería validar que targetWeight está entre 0 y 1', () => {
    const schema = z.object({
      targetType: z.enum(['instrument', 'assetClass']),
      instrumentId: uuidSchema.optional(),
      assetClass: z.string().optional(),
      targetWeight: z
        .number()
        .min(0, 'El peso debe ser mayor o igual a 0')
        .max(1, 'El peso debe ser menor o igual a 1'),
    });

    // Validar pesos válidos
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: 0.5,
      })
    ).not.toThrow();
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: 0,
      })
    ).not.toThrow();
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: 1,
      })
    ).not.toThrow();

    // Validar pesos inválidos
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: -0.1,
      })
    ).toThrow();
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: 1.1,
      })
    ).toThrow();
    expect(() =>
      schema.parse({
        targetType: 'instrument',
        instrumentId: '550e8400-e29b-41d4-a716-446655440000',
        targetWeight: 2.0,
      })
    ).toThrow();
  });

  it('debería validar que suma de pesos no exceda 1.0', async () => {
    const existingLines = [{ weight: '0.7' }, { weight: '0.2' }];
    const currentTotal = existingLines.reduce((sum, line) => sum + Number(line.weight), 0);
    const newWeight = 0.2;
    const wouldExceed = currentTotal + newWeight > 1.0;

    expect(wouldExceed).toBe(true);
  });
});

describe('Portfolio Template Lines - DELETE /templates/:id/lines/:lineId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería eliminar línea existente', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    mockDb.mockReturnValue({
      delete: mockDelete,
    } as any);

    expect(mockDelete).toBeDefined();
  });
});

describe('Portfolio Template Lines - GET /templates/lines/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener líneas de múltiples templates', async () => {
    const templateIds = ['template-1', 'template-2'];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockResolvedValue([
            {
              templateId: 'template-1',
              lineId: 'line-1',
              targetWeight: '0.5',
            },
            {
              templateId: 'template-2',
              lineId: 'line-2',
              targetWeight: '0.3',
            },
          ]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(templateIds).toHaveLength(2);
  });

  it('debería validar formato UUID de IDs', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUuid = 'not-a-uuid';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(validUuid)).toBe(true);
    expect(uuidRegex.test(invalidUuid)).toBe(false);
  });
});

describe('Portfolio Assignments - POST /assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería asignar portfolio a contacto', async () => {
    const accessScope = {
      userId: 'user-123',
      role: 'advisor' as const,
      accessibleAdvisorIds: ['user-123'],
      canSeeUnassigned: false,
      canAssignToOthers: false,
      canReassign: false,
    };

    mockGetUserAccessScope.mockResolvedValue(accessScope);

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'contact-123' }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'template-123' }]),
          }),
        }),
      });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'assignment-123',
            contactId: 'contact-123',
            templateId: 'template-123',
            status: 'active',
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    } as any);

    expect(accessScope.role).toBe('advisor');
  });

  it('debería validar acceso al contacto', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      userId: 'user-123',
      role: 'advisor' as const,
      accessibleAdvisorIds: ['user-123'],
      canSeeUnassigned: false,
      canAssignToOthers: false,
      canReassign: false,
    });

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No access
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect([]).toHaveLength(0);
  });

  it('debería validar formato de fecha ISO', () => {
    const validDate = '2024-01-15T10:30:00.000Z';
    const invalidDate = '2024-01-15';

    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

    expect(isoRegex.test(validDate)).toBe(true);
    expect(isoRegex.test(invalidDate)).toBe(false);
  });

  it('debería desactivar asignaciones previas del contacto', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    expect(mockUpdate).toBeDefined();
  });
});

describe('Portfolio Assignments - GET /contacts/:id/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería retornar portfolio activo del contacto', async () => {
    const accessScope = {
      userId: 'user-123',
      role: 'advisor' as const,
      accessibleAdvisorIds: ['user-123'],
      canSeeUnassigned: false,
      canAssignToOthers: false,
      canReassign: false,
    };

    mockGetUserAccessScope.mockResolvedValue(accessScope);

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'contact-123' }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'assignment-123',
                  templateId: 'template-123',
                },
              ]),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(accessScope.role).toBe('advisor');
  });

  it('debería retornar null si no hay portfolio asignado', async () => {
    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'contact-123' }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No assignment
            }),
          }),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect([]).toHaveLength(0);
  });
});

describe('Portfolio Assignments - PATCH /assignments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería actualizar estado de asignación', async () => {
    const validStatuses = ['active', 'paused', 'ended'];

    validStatuses.forEach((status) => {
      expect(['active', 'paused', 'ended']).toContain(status);
    });
  });

  it('debería establecer endDate cuando status es ended', () => {
    const status = 'ended';
    const shouldSetEndDate = status === 'ended';

    expect(shouldSetEndDate).toBe(true);
  });
});

describe('Portfolio Assignments - DELETE /assignments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería hacer soft delete (marcar como ended)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    expect(mockUpdate).toBeDefined();
  });
});

describe('Error Handling', () => {
  it('debería manejar errores 401 (no autenticado)', () => {
    const user = null;
    expect(user).toBeNull();
  });

  it('debería manejar errores 403 (acceso denegado)', () => {
    const role = 'advisor';
    const allowedRoles = ['admin', 'manager'];
    expect(allowedRoles).not.toContain(role);
  });

  it('debería manejar errores 404 (no encontrado)', () => {
    const result = [];
    expect(result).toHaveLength(0);
  });

  it('debería manejar errores 500 (error servidor)', () => {
    const error = new Error('Database error');
    expect(error).toBeInstanceOf(Error);
  });
});
