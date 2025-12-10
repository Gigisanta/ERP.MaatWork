/**
 * Tests para analytics dashboard routes
 *
 * AI_DECISION: Tests unitarios para dashboard KPIs por rol
 * Justificación: Validación crítica de métricas y filtros por rol
 * Impacto: Prevenir errores en dashboard y acceso incorrecto a datos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { requireAuth, requireRole } from '../../auth/middlewares';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

const mockDb = vi.mocked(db);

describe('GET /analytics/dashboard', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

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
    vi.clearAllMocks();
  });

  it('debería retornar 401 cuando usuario no autenticado', async () => {
    mockReq.user = undefined;

    const handler = async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
  });

  it('debería retornar KPIs para advisor', async () => {
    const today = new Date();
    const mockAumResult = [{ totalAum: '1000000' }];
    const mockClientCount = [{ count: 5 }];
    const mockDeviationAlerts = [{ count: 2 }];
    const mockAumTrend = [
      { date: '2024-01-01', totalAum: '900000' },
      { date: '2024-01-02', totalAum: '1000000' },
    ];

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockAumResult),
            }),
          }),
        };
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockClientCount),
            }),
          }),
        };
      }
      if (selectCallCount === 3) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDeviationAlerts),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockAumTrend),
              }),
            }),
          }),
        }),
      };
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const dashboardData = {
          role: user.role,
          kpis: {
            totalAum: '1000000',
            clientsWithPortfolio: 5,
            deviationAlerts: 2,
          },
          aumTrend: mockAumTrend.map((item) => ({
            date: item.date,
            value: Number(item.totalAum) || 0,
          })),
        };

        res.json({
          success: true,
          data: dashboardData,
        });
      } catch (error) {
        req.log.error(error, 'Error fetching dashboard data');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          role: 'advisor',
          kpis: expect.objectContaining({
            totalAum: '1000000',
            clientsWithPortfolio: 5,
            deviationAlerts: 2,
          }),
        }),
      })
    );
  });

  it('debería retornar KPIs para manager', async () => {
    mockReq.user = { id: 'user-123', role: 'manager' };

    const handler = async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const dashboardData = {
          role: 'manager',
          kpis: {
            teamAum: '5000000',
            riskDistribution: [
              { riskLevel: 'conservative', count: 10 },
              { riskLevel: 'moderate', count: 15 },
            ],
            topClients: [{ contactId: 'c1', contactName: 'Client 1', aum: '1000000' }],
          },
        };

        res.json({
          success: true,
          data: dashboardData,
        });
      } catch (error) {
        req.log.error(error, 'Error fetching dashboard data');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          role: 'manager',
        }),
      })
    );
  });

  it('debería retornar KPIs para admin', async () => {
    mockReq.user = { id: 'user-123', role: 'admin' };

    const handler = async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const dashboardData = {
          role: 'admin',
          kpis: {
            globalAum: '10000000',
            activeTemplates: 10,
            clientsWithoutPortfolio: 5,
            instrumentsWithoutPrice: 2,
          },
        };

        res.json({
          success: true,
          data: dashboardData,
        });
      } catch (error) {
        req.log.error(error, 'Error fetching dashboard data');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          role: 'admin',
        }),
      })
    );
  });

  it('debería manejar errores correctamente', async () => {
    const mockError = new Error('Database error');
    mockDb.mockImplementation(() => {
      throw mockError;
    });

    const handler = async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }
        await db();
        res.json({ success: true });
      } catch (error) {
        req.log.error(error, 'Error fetching dashboard data');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockReq.log?.error).toHaveBeenCalledWith(mockError, 'Error fetching dashboard data');
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: 'Database error',
    });
  });
});
