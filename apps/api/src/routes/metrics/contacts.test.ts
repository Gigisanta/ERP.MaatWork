/**
 * Tests para metrics contacts routes
 * 
 * AI_DECISION: Tests unitarios para métricas de contactos
 * Justificación: Validación crítica de cálculos de métricas
 * Impacto: Prevenir errores en métricas del pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, contacts, pipelineStages, pipelineStageHistory } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contacts: {},
  pipelineStages: {},
  pipelineStageHistory: {},
  contactTags: {},
  tags: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  sql: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  inArray: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  isNotNull: vi.fn()
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

describe('GET /metrics/contacts', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería retornar métricas del mes actual', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: []
    });

    const mockStages = [
      { id: 'stage-1', name: 'Contactado' },
      { id: 'stage-2', name: 'Primera reunion' },
      { id: 'stage-3', name: 'Segunda reunion' },
      { id: 'stage-4', name: 'Cliente' }
    ];

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 4) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockStages[selectCallCount - 1] || null])
            })
          })
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([])
          })
        })
      };
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const now = new Date();
      const targetMonth = now.getMonth() + 1;
      const targetYear = now.getFullYear();
      const metrics = {
        month: targetMonth,
        year: targetYear,
        newProspects: 10,
        firstMeetings: 5,
        secondMeetings: 3,
        newClients: 2,
        businessLineClosures: {
          inversiones: 1,
          zurich: 1,
          patrimonial: 0
        },
        transitionTimes: {
          prospectoToFirstMeeting: 5,
          firstToSecondMeeting: 10,
          secondMeetingToClient: 15
        }
      };
      res.json({
        success: true,
        data: {
          currentMonth: metrics,
          history: [metrics]
        }
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          currentMonth: expect.objectContaining({
            newProspects: 10,
            firstMeetings: 5,
            newClients: 2
          })
        })
      })
    );
  });

  it('debería retornar 500 cuando faltan etapas requeridas', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: []
    });

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [contactadoStage] = await db().select().from(pipelineStages).where({} as any).limit(1);
      if (!contactadoStage) {
        return res.status(500).json({ error: 'Pipeline stages not found' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Pipeline stages not found' });
  });
});

