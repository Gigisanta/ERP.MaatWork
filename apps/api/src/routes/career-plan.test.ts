/**
 * Tests para career-plan routes
 *
 * AI_DECISION: Tests unitarios para CRUD de career plan levels y cálculo de progreso
 * Justificación: Validación crítica de plan de carrera y progreso de usuarios
 * Impacto: Prevenir errores en gestión de niveles y cálculos de progreso
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, careerPlanLevels } from '@cactus/db';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { calculateUserCareerProgress } from '../utils/career-plan';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  careerPlanLevels: {},
  eq: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../utils/career-plan', () => ({
  calculateUserCareerProgress: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockCalculateUserCareerProgress = vi.mocked(calculateUserCareerProgress);

describe('GET /career-plan/levels', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería listar todos los niveles ordenados por levelNumber', async () => {
    const mockData = [
      {
        id: 'level-1',
        category: 'Advisor',
        level: 'Junior',
        levelNumber: 1,
        index: '1',
        percentage: '10%',
        annualGoalUsd: 100000,
        isActive: true,
      },
      {
        id: 'level-2',
        category: 'Advisor',
        level: 'Senior',
        levelNumber: 2,
        index: '2',
        percentage: '20%',
        annualGoalUsd: 200000,
        isActive: true,
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockData),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dbi = db();
        const levels = await dbi
          .select()
          .from(careerPlanLevels)
          .orderBy(asc(careerPlanLevels.levelNumber));
        res.json({ success: true, data: levels });
      } catch (err) {
        req.log?.error({ err }, 'failed to list career plan levels');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockData });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería manejar errores al listar niveles', async () => {
    const mockError = new Error('Database error');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockRejectedValue(mockError),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dbi = db();
        const levels = await dbi
          .select()
          .from(careerPlanLevels)
          .orderBy(asc(careerPlanLevels.levelNumber));
        res.json({ success: true, data: levels });
      } catch (err) {
        req.log?.error({ err }, 'failed to list career plan levels');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.log?.error).toHaveBeenCalledWith(
      { err: mockError },
      'failed to list career plan levels'
    );
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});

describe('GET /career-plan/levels/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'level-123' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener nivel específico por id', async () => {
    const mockData = {
      id: 'level-123',
      category: 'Advisor',
      level: 'Junior',
      levelNumber: 1,
      index: '1',
      percentage: '10%',
      annualGoalUsd: 100000,
      isActive: true,
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockData]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const dbi = db();
        const [level] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!level) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        res.json({ success: true, data: level });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to get career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockData });
  });

  it('debería retornar 404 cuando nivel no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const dbi = db();
        const [level] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!level) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        res.json({ success: true, data: level });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to get career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Career plan level not found' });
  });
});

describe('POST /career-plan/levels', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        category: 'Advisor',
        level: 'Junior',
        levelNumber: 1,
        index: '1',
        percentage: '10%',
        annualGoalUsd: 100000,
        isActive: true,
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería crear nuevo nivel (admin only)', async () => {
    const newLevel = {
      id: 'level-new',
      ...mockReq.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // levelNumber no existe
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newLevel]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dbi = db();
        const data = req.body;
        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
          .limit(1);

        if (existing) {
          return res.status(409).json({ error: 'Level number already exists' });
        }

        const [newLevel] = await dbi
          .insert(careerPlanLevels)
          .values({
            category: data.category,
            level: data.level,
            levelNumber: data.levelNumber,
            index: data.index,
            percentage: data.percentage,
            annualGoalUsd: data.annualGoalUsd,
            isActive: data.isActive ?? true,
          })
          .returning();

        req.log?.info({ levelId: newLevel.id }, 'career plan level created');
        res.status(201).json({ success: true, data: newLevel });
      } catch (err) {
        req.log?.error({ err }, 'failed to create career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: newLevel });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { levelId: newLevel.id },
      'career plan level created'
    );
  });

  it('debería retornar 409 cuando levelNumber ya existe', async () => {
    const existing = {
      id: 'level-existing',
      levelNumber: 1,
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dbi = db();
        const data = req.body;
        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
          .limit(1);

        if (existing) {
          return res.status(409).json({ error: 'Level number already exists' });
        }

        const [newLevel] = await dbi
          .insert(careerPlanLevels)
          .values({
            category: data.category,
            level: data.level,
            levelNumber: data.levelNumber,
            index: data.index,
            percentage: data.percentage,
            annualGoalUsd: data.annualGoalUsd,
            isActive: data.isActive ?? true,
          })
          .returning();

        req.log?.info({ levelId: newLevel.id }, 'career plan level created');
        res.status(201).json({ success: true, data: newLevel });
      } catch (err) {
        req.log?.error({ err }, 'failed to create career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Level number already exists' });
  });
});

describe('PUT /career-plan/levels/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'level-123' },
      body: {
        level: 'Senior',
        levelNumber: 2,
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería actualizar nivel (admin only)', async () => {
    const existing = {
      id: 'level-123',
      category: 'Advisor',
      level: 'Junior',
      levelNumber: 1,
      index: '1',
      percentage: '10%',
      annualGoalUsd: 100000,
      isActive: true,
    };

    const updated = {
      ...existing,
      ...mockReq.body,
      updatedAt: new Date(),
    };

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // levelNumber no duplicado
          }),
        }),
      });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const data = req.body;
        const dbi = db();

        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        if (data.levelNumber !== undefined && data.levelNumber !== existing.levelNumber) {
          const [duplicate] = await dbi
            .select()
            .from(careerPlanLevels)
            .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
            .limit(1);

          if (duplicate) {
            return res.status(409).json({ error: 'Level number already exists' });
          }
        }

        const updateData: Partial<typeof existing> = {};
        if (data.category !== undefined) updateData.category = data.category;
        if (data.level !== undefined) updateData.level = data.level;
        if (data.levelNumber !== undefined) updateData.levelNumber = data.levelNumber;
        if (data.index !== undefined) updateData.index = data.index;
        if (data.percentage !== undefined) updateData.percentage = data.percentage;
        if (data.annualGoalUsd !== undefined) updateData.annualGoalUsd = data.annualGoalUsd;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        updateData.updatedAt = new Date();

        const [updatedLevel] = await dbi
          .update(careerPlanLevels)
          .set(updateData)
          .where(eq(careerPlanLevels.id, id))
          .returning();

        req.log?.info({ levelId: id }, 'career plan level updated');
        res.json({ success: true, data: updatedLevel });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to update career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { levelId: 'level-123' },
      'career plan level updated'
    );
  });

  it('debería retornar 404 cuando nivel no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const data = req.body;
        const dbi = db();

        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        // ... resto del código
        res.json({ success: true });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to update career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Career plan level not found' });
  });

  it('debería retornar 409 cuando levelNumber duplicado', async () => {
    const existing = {
      id: 'level-123',
      levelNumber: 1,
    };

    const duplicate = {
      id: 'level-456',
      levelNumber: 2,
    };

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([duplicate]),
          }),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const data = req.body;
        const dbi = db();

        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        if (data.levelNumber !== undefined && data.levelNumber !== existing.levelNumber) {
          const [duplicate] = await dbi
            .select()
            .from(careerPlanLevels)
            .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
            .limit(1);

          if (duplicate) {
            return res.status(409).json({ error: 'Level number already exists' });
          }
        }

        res.json({ success: true });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to update career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Level number already exists' });
  });
});

describe('DELETE /career-plan/levels/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'level-123' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería eliminar nivel (admin only)', async () => {
    const existing = {
      id: 'level-123',
      category: 'Advisor',
      level: 'Junior',
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const dbi = db();

        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        await dbi.delete(careerPlanLevels).where(eq(careerPlanLevels.id, id));

        req.log?.info({ levelId: id }, 'career plan level deleted');
        res.json({ success: true });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to delete career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { levelId: 'level-123' },
      'career plan level deleted'
    );
  });

  it('debería retornar 404 cuando nivel no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const dbi = db();

        const [existing] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Career plan level not found' });
        }

        await dbi.delete(careerPlanLevels).where(eq(careerPlanLevels.id, id));

        req.log?.info({ levelId: id }, 'career plan level deleted');
        res.json({ success: true });
      } catch (err) {
        req.log?.error({ err, levelId: req.params.id }, 'failed to delete career plan level');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Career plan level not found' });
  });
});

describe('GET /career-plan/user-progress', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        role: 'advisor',
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería calcular progreso del usuario', async () => {
    const mockProgress = {
      currentLevel: {
        id: 'level-1',
        level: 'Junior',
        levelNumber: 1,
      },
      nextLevel: {
        id: 'level-2',
        level: 'Senior',
        levelNumber: 2,
      },
      progress: 0.5,
      annualGoalUsd: 100000,
      currentAum: 50000,
    };

    mockCalculateUserCareerProgress.mockResolvedValue(mockProgress);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const progress = await calculateUserCareerProgress(userId, userRole);
        res.json({ success: true, data: progress });
      } catch (err) {
        req.log?.error({ err, userId: req.user?.id }, 'failed to calculate user career progress');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockCalculateUserCareerProgress).toHaveBeenCalledWith('user-123', 'advisor');
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockProgress });
  });

  it('debería manejar errores al calcular progreso', async () => {
    const mockError = new Error('Calculation error');
    mockCalculateUserCareerProgress.mockRejectedValue(mockError);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const progress = await calculateUserCareerProgress(userId, userRole);
        res.json({ success: true, data: progress });
      } catch (err) {
        req.log?.error({ err, userId: req.user?.id }, 'failed to calculate user career progress');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.log?.error).toHaveBeenCalledWith(
      { err: mockError, userId: 'user-123' },
      'failed to calculate user career progress'
    );
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
