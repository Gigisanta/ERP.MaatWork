/**
 * Tests para pipeline stages utilities
 *
 * AI_DECISION: Tests unitarios para garantizar etapas por defecto del pipeline
 * Justificación: Etapas requeridas para funcionamiento del CRM
 * Impacto: Asegurar que siempre existan las 7 etapas requeridas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, pipelineStages } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { ensureDefaultPipelineStages, DEFAULT_PIPELINE_STAGES } from './pipeline-stages';

// Mock DB
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  pipelineStages: {
    id: 'pipelineStages.id',
    name: 'pipelineStages.name',
    description: 'pipelineStages.description',
    order: 'pipelineStages.order',
    color: 'pipelineStages.color',
    wipLimit: 'pipelineStages.wipLimit',
    isActive: 'pipelineStages.isActive',
    updatedAt: 'pipelineStages.updatedAt',
  },
  eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
}));

const mockDb = vi.mocked(db);

describe('DEFAULT_PIPELINE_STAGES', () => {
  it('debería tener 7 etapas', () => {
    expect(DEFAULT_PIPELINE_STAGES).toHaveLength(7);
  });

  it('debería tener etapas en orden correcto', () => {
    const stages = DEFAULT_PIPELINE_STAGES;
    expect(stages[0].order).toBe(1);
    expect(stages[1].order).toBe(2);
    expect(stages[2].order).toBe(3);
    expect(stages[3].order).toBe(4);
    expect(stages[4].order).toBe(5);
    expect(stages[5].order).toBe(6);
    expect(stages[6].order).toBe(7);
  });

  it('debería tener nombres correctos', () => {
    const stageNames = DEFAULT_PIPELINE_STAGES.map((s) => s.name);
    expect(stageNames).toContain('Prospecto');
    expect(stageNames).toContain('Contactado');
    expect(stageNames).toContain('Primera reunion');
    expect(stageNames).toContain('Segunda reunion');
    expect(stageNames).toContain('Cliente');
    expect(stageNames).toContain('Cuenta vacia');
    expect(stageNames).toContain('Caido');
  });

  it('debería tener todos los campos requeridos', () => {
    DEFAULT_PIPELINE_STAGES.forEach((stage) => {
      expect(stage).toHaveProperty('name');
      expect(stage).toHaveProperty('description');
      expect(stage).toHaveProperty('order');
      expect(stage).toHaveProperty('color');
      expect(stage).toHaveProperty('wipLimit');
      expect(typeof stage.name).toBe('string');
      expect(typeof stage.description).toBe('string');
      expect(typeof stage.order).toBe('number');
      expect(typeof stage.color).toBe('string');
      expect(stage.wipLimit === null || typeof stage.wipLimit === 'number').toBe(true);
    });
  });
});

describe('ensureDefaultPipelineStages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creating stages', () => {
    it('debería crear etapas cuando no existen', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No stages exist
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      await ensureDefaultPipelineStages();

      // Debería intentar insertar cada etapa
      expect(mockInsert).toHaveBeenCalled();
    });

    it('debería crear todas las 7 etapas', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No stages exist
          }),
        }),
      });

      let insertCallCount = 0;
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(() => {
          insertCallCount++;
          return Promise.resolve([]);
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      await ensureDefaultPipelineStages();

      // Debería intentar crear 7 etapas
      expect(insertCallCount).toBe(7);
    });
  });

  describe('Updating existing stages', () => {
    it('debería actualizar etapa existente', async () => {
      const existingStage = {
        id: 'stage-123',
        name: 'Prospecto',
        description: 'Old description',
        order: 1,
        color: '#000000',
        wipLimit: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingStage]), // Stage exists
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      await ensureDefaultPipelineStages();

      // Debería actualizar la etapa existente
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('debería actualizar campos correctos', async () => {
      const existingStage = {
        id: 'stage-123',
        name: 'Prospecto',
        description: 'Old description',
        order: 1,
        color: '#000000',
        wipLimit: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingStage]),
          }),
        }),
      });

      let setValues: Record<string, unknown> | null = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
          setValues = values;
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      await ensureDefaultPipelineStages();

      // Debería actualizar description, order, color, wipLimit, isActive
      expect(setValues).toBeTruthy();
      expect(setValues).toHaveProperty('description');
      expect(setValues).toHaveProperty('order');
      expect(setValues).toHaveProperty('color');
      expect(setValues).toHaveProperty('wipLimit');
      expect(setValues.isActive).toBe(true);
    });
  });

  describe('Idempotency', () => {
    it('debería ser idempotente - puede ejecutarse múltiples veces', async () => {
      const existingStage = {
        id: 'stage-123',
        name: 'Prospecto',
        description: 'Description',
        order: 1,
        color: '#3b82f6',
        wipLimit: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingStage]),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      // Ejecutar múltiples veces
      await ensureDefaultPipelineStages();
      await ensureDefaultPipelineStages();
      await ensureDefaultPipelineStages();

      // No debería lanzar errores
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('debería manejar errores sin lanzar excepción', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      // No debería lanzar error
      await expect(ensureDefaultPipelineStages()).resolves.not.toThrow();
    });

    it('debería continuar con otras etapas si una falla', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockRejectedValue(new Error('Error on first stage')),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      await ensureDefaultPipelineStages();

      // Debería continuar procesando otras etapas
      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('Silent mode', () => {
    it('debería funcionar en modo silencioso', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      // Ejecutar con silent=true
      await ensureDefaultPipelineStages(true);

      // Debería funcionar sin errores
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
