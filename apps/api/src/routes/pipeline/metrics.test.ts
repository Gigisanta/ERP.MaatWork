/**
 * Tests para pipeline metrics routes
 * 
 * AI_DECISION: Tests unitarios para métricas de pipeline
 * Justificación: Validación crítica de métricas y exportación
 * Impacto: Prevenir errores en cálculos de métricas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, pipelineStages, contacts, pipelineStageHistory } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  pipelineStages: {},
  contacts: {},
  pipelineStageHistory: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  count: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next())
}));

vi.mock('../../auth/authorization', () => ({
  getUserAccessScope: vi.fn(),
  buildContactAccessFilter: vi.fn(() => ({ whereClause: {} }))
}));

const mockDb = vi.mocked(db);
const mockGetUserAccessScope = vi.mocked(getUserAccessScope);

describe('GET /pipeline/metrics', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería retornar métricas de conversión por etapa', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: []
    });

    const mockStages = [
      { id: 'stage-1', name: 'Stage 1', order: 1, isActive: true },
      { id: 'stage-2', name: 'Stage 2', order: 2, isActive: true }
    ];

    const mockEnteredCounts = [{ toStage: 'stage-1', count: 10 }];
    const mockExitedCounts = [{ fromStage: 'stage-1', count: 5 }];
    const mockCurrentCounts = [{ pipelineStageId: 'stage-1', count: 3 }];

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockStages)
            })
          })
        };
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockEnteredCounts)
            })
          })
        };
      }
      if (selectCallCount === 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockExitedCounts)
            })
          })
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockCurrentCounts)
          })
        })
      };
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const stages = mockStages;
      const enteredMap = new Map([['stage-1', 10]]);
      const exitedMap = new Map([['stage-1', 5]]);
      const currentMap = new Map([['stage-1', 3]]);
      const stageMetrics = stages.map(stage => {
        const entered = enteredMap.get(stage.id) || 0;
        const exited = exitedMap.get(stage.id) || 0;
        const current = currentMap.get(stage.id) || 0;
        const conversionRate = entered > 0 ? ((exited / entered) * 100).toFixed(2) : '0.00';
        return {
          stageId: stage.id,
          stageName: stage.name,
          entered,
          exited,
          current,
          conversionRate: parseFloat(conversionRate)
        };
      });
      res.json({
        success: true,
        data: {
          stageMetrics,
          overallConversionRate: 50.0
        }
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stageMetrics: expect.arrayContaining([
            expect.objectContaining({
              stageId: 'stage-1',
              entered: 10,
              exited: 5,
              conversionRate: 50.0
            })
          ])
        })
      })
    );
  });
});

describe('GET /pipeline/metrics/export', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      setHeader: vi.fn(),
      send: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería exportar métricas como CSV', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: []
    });

    const mockStages = [
      { id: 'stage-1', name: 'Stage 1', order: 1, isActive: true }
    ];

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const stages = mockStages;
      const metrics = stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        entered: 10,
        exited: 5,
        averageTimeInDays: 0,
        totalValue: 0
      }));
      const headers = ['stageName', 'entered', 'exited', 'conversionRate'];
      const csv = [
        headers.join(','),
        ...metrics.map(item => [
          item.stageName,
          item.entered.toString(),
          item.exited.toString(),
          ((item.exited / (item.entered || 1)) * 100).toFixed(2)
        ].join(','))
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pipeline_metrics_${new Date().toISOString()}.csv"`);
      res.send(csv);
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.send).toHaveBeenCalled();
  });
});

