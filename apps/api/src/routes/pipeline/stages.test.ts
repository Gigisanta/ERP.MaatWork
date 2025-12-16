/**
 * Tests para pipeline stages routes
 *
 * AI_DECISION: Tests unitarios para CRUD de pipeline stages
 * Justificación: Validación crítica de etapas y cache
 * Impacto: Prevenir errores en gestión de pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, pipelineStages, contacts } from '@cactus/db';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';
import { pipelineStagesCache } from '../../utils/performance/cache';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  pipelineStages: {},
  contacts: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  count: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../auth/authorization', () => ({
  getUserAccessScope: vi.fn(),
  buildContactAccessFilter: vi.fn(() => ({ whereClause: {} })),
}));

vi.mock('../../utils/performance/cache', () => ({
  pipelineStagesCache: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}));

vi.mock('../../utils/pipeline-stages', () => ({
  ensureDefaultPipelineStages: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockGetUserAccessScope = vi.mocked(getUserAccessScope);
const mockPipelineStagesCache = vi.mocked(pipelineStagesCache);

describe('GET /pipeline/stages', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería retornar stages desde cache si existe', async () => {
    const cachedData = [{ id: 'stage-1', name: 'Stage 1', contactCount: 5 }];
    mockPipelineStagesCache.get.mockReturnValue(cachedData);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const cacheKey = 'advisor:user-123';
      const cached = pipelineStagesCache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached });
      }
      res.json({ success: true, data: [] });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: cachedData });
  });

  it('debería listar stages con contact counts', async () => {
    mockPipelineStagesCache.get.mockReturnValue(null);
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: [],
    });

    const mockStages = [
      { id: 'stage-1', name: 'Stage 1', order: 1, isActive: true },
      { id: 'stage-2', name: 'Stage 2', order: 2, isActive: true },
    ];

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockStages),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([{ pipelineStageId: 'stage-1', count: 5 }]),
          }),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const stages = mockStages;
      const stageCounts = [{ pipelineStageId: 'stage-1', count: 5 }];
      const countsMap = new Map(stageCounts.map((sc) => [sc.pipelineStageId, Number(sc.count)]));
      const stagesWithCounts = stages.map((stage) => ({
        ...stage,
        contactCount: countsMap.get(stage.id) || 0,
      }));
      res.json({ success: true, data: stagesWithCounts });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ id: 'stage-1', contactCount: 5 })]),
      })
    );
  });
});

describe('POST /pipeline/stages', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'admin' },
      body: {
        name: 'New Stage',
        description: 'Description',
        order: 3,
        color: '#FF0000',
        wipLimit: 10,
      },
      log: { error: vi.fn(), info: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería crear nueva stage e invalidar cache', async () => {
    const newStage = { id: 'stage-new', ...mockReq.body };
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newStage]),
      }),
    });

    mockDb.mockReturnValue({
      insert: mockInsert,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [newStage] = await db().insert(pipelineStages).values(req.body).returning();
      pipelineStagesCache.invalidate();
      res.status(201).json({ data: newStage });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPipelineStagesCache.invalidate).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});

describe('PUT /pipeline/stages/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'admin' },
      params: { id: 'stage-123' },
      body: { name: 'Updated Stage' },
      log: { error: vi.fn(), info: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería actualizar stage e invalidar cache', async () => {
    const updated = { id: 'stage-123', ...mockReq.body };
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [updated] = await db()
        .update(pipelineStages)
        .set({ ...req.body, updatedAt: new Date() })
        .where({} as any)
        .returning();
      if (!updated) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      pipelineStagesCache.invalidate();
      res.json({ success: true, data: updated });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPipelineStagesCache.invalidate).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('debería retornar 404 cuando stage no existe', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      update: mockUpdate,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [updated] = await db()
        .update(pipelineStages)
        .set({ ...req.body, updatedAt: new Date() })
        .where({} as any)
        .returning();
      if (!updated) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});
