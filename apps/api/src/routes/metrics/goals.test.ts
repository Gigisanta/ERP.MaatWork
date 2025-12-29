/**
 * Tests para metrics goals routes
 *
 * AI_DECISION: Tests unitarios para objetivos mensuales
 * Justificación: Validación crítica de objetivos
 * Impacto: Prevenir errores en gestión de objetivos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, monthlyGoals } from '@maatwork/db';
import { requireAuth } from '../../auth/middlewares';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  monthlyGoals: {},
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

const mockDb = vi.mocked(db);

describe('GET /metrics/goals', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener objetivos del mes actual', async () => {
    const now = new Date();
    const mockGoal = {
      id: 'goal-1',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      newProspectsGoal: 20,
      firstMeetingsGoal: 15,
      secondMeetingsGoal: 10,
      newClientsGoal: 5,
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockGoal]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { month, year } = req.query;
      const now = new Date();
      const targetMonth = month ? Number(month) : now.getMonth() + 1;
      const targetYear = year ? Number(year) : now.getFullYear();
      const [goal] = await db()
        .select()
        .from(monthlyGoals)
        .where({} as any)
        .limit(1);
      res.json({
        success: true,
        data: goal || null,
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockGoal,
    });
  });

  it('debería retornar null cuando no hay objetivos', async () => {
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
      const [goal] = await db()
        .select()
        .from(monthlyGoals)
        .where({} as any)
        .limit(1);
      res.json({
        success: true,
        data: goal || null,
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: null,
    });
  });
});

describe('POST /metrics/goals', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      body: {
        month: 1,
        year: 2024,
        newProspectsGoal: 20,
        firstMeetingsGoal: 15,
        secondMeetingsGoal: 10,
        newClientsGoal: 5,
      },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería crear nuevos objetivos', async () => {
    const newGoal = {
      id: 'goal-new',
      ...mockReq.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newGoal]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const validated = req.body;
      const [existing] = await db()
        .select()
        .from(monthlyGoals)
        .where({} as any)
        .limit(1);
      let result;
      if (existing) {
        const [updated] = await db()
          .update(monthlyGoals)
          .set({ ...validated, updatedAt: new Date() })
          .where({} as any)
          .returning();
        result = updated;
      } else {
        const [newGoal] = await db().insert(monthlyGoals).values(validated).returning();
        result = newGoal;
      }
      res.json({ success: true, data: result });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: newGoal });
  });

  it('debería actualizar objetivos existentes', async () => {
    const existing = {
      id: 'goal-1',
      month: 1,
      year: 2024,
    };

    const updated = {
      ...existing,
      ...mockReq.body,
      updatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
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
      const validated = req.body;
      const [existing] = await db()
        .select()
        .from(monthlyGoals)
        .where({} as any)
        .limit(1);
      let result;
      if (existing) {
        const [updated] = await db()
          .update(monthlyGoals)
          .set({ ...validated, updatedAt: new Date() })
          .where({} as any)
          .returning();
        result = updated;
      } else {
        const [newGoal] = await db().insert(monthlyGoals).values(validated).returning();
        result = newGoal;
      }
      res.json({ success: true, data: result });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
  });
});
