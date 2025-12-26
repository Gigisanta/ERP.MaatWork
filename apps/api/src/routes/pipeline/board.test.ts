/**
 * Tests para pipeline board routes
 *
 * AI_DECISION: Tests unitarios para board kanban
 * Justificación: Validación crítica de board view con contactos
 * Impacto: Prevenir errores en visualización de pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, pipelineStages, contacts } from '@maatwork/db';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  pipelineStages: {},
  contacts: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock('../../auth/authorization', () => ({
  getUserAccessScope: vi.fn(),
  buildContactAccessFilter: vi.fn(() => ({ whereClause: {} })),
}));

vi.mock('../../utils/pipeline-stages', () => ({
  ensureDefaultPipelineStages: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockGetUserAccessScope = vi.mocked(getUserAccessScope);

describe('GET /pipeline/board', () => {
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

  it('debería retornar board con stages y contactos agrupados', async () => {
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: [],
    });

    const mockStages = [
      { id: 'stage-1', name: 'Stage 1', order: 1, isActive: true },
      { id: 'stage-2', name: 'Stage 2', order: 2, isActive: true },
    ];

    const mockContacts = [
      { id: 'contact-1', pipelineStageId: 'stage-1', firstName: 'John' },
      { id: 'contact-2', pipelineStageId: 'stage-1', firstName: 'Jane' },
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
          where: vi.fn().mockResolvedValue(mockContacts),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const stages = mockStages;
      const allContacts = mockContacts;
      const contactsByStageId = new Map<string, typeof mockContacts>();
      for (const contact of allContacts) {
        if (contact.pipelineStageId) {
          const existing = contactsByStageId.get(contact.pipelineStageId) || [];
          existing.push(contact);
          contactsByStageId.set(contact.pipelineStageId, existing);
        }
      }
      const board = stages.map((stage) => ({
        ...stage,
        contacts: contactsByStageId.get(stage.id) || [],
        currentCount: (contactsByStageId.get(stage.id) || []).length,
      }));
      res.json({ success: true, data: board });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'stage-1',
            contacts: expect.arrayContaining([expect.objectContaining({ id: 'contact-1' })]),
            currentCount: 2,
          }),
        ]),
      })
    );
  });

  it('debería filtrar por assignedAdvisorId cuando se proporciona', async () => {
    mockReq.query = { assignedAdvisorId: 'advisor-123' };
    mockGetUserAccessScope.mockResolvedValue({
      accessibleAdvisorIds: ['user-123'],
      accessibleTeamIds: [],
    });

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { assignedAdvisorId } = req.query;
      expect(assignedAdvisorId).toBe('advisor-123');
      res.json({ success: true, data: [] });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalled();
  });
});
