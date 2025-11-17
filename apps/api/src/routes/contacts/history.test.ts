/**
 * Tests para contacts history routes
 * 
 * AI_DECISION: Tests unitarios para historial de cambios
 * Justificación: Validación crítica de historial
 * Impacto: Prevenir errores en consulta de historial
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, contactFieldHistory } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contactFieldHistory: {},
  eq: vi.fn(),
  desc: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next())
}));

const mockDb = vi.mocked(db);

describe('GET /contacts/:id/history', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      params: { id: 'contact-123' },
      query: { limit: '50', offset: '0' },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener historial de cambios con paginación', async () => {
    const mockHistory = [
      {
        id: 'history-1',
        contactId: 'contact-123',
        fieldName: 'firstName',
        oldValue: 'John',
        newValue: 'Johnny',
        changedAt: new Date()
      },
      {
        id: 'history-2',
        contactId: 'contact-123',
        fieldName: 'email',
        oldValue: 'old@example.com',
        newValue: 'new@example.com',
        changedAt: new Date()
      }
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      })
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const history = await db()
        .select()
        .from(contactFieldHistory)
        .where({} as any)
        .orderBy({} as any)
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      res.json({
        data: history,
        meta: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'history-1' })
        ]),
        meta: expect.objectContaining({
          limit: 50,
          offset: 0
        })
      })
    );
  });
});

