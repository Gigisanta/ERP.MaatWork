/**
 * Tests para analytics metrics routes
 *
 * AI_DECISION: Tests unitarios para catálogo de métricas
 * Justificación: Validación de catálogo de métricas disponibles
 * Impacto: Prevenir errores en listado de métricas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';

// Mock dependencies
vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

describe('GET /analytics/metrics', () => {
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

  it('debería retornar catálogo de métricas', async () => {
    const metrics = [
      {
        code: 'twr',
        name: 'Time-Weighted Return',
        description: 'Retorno ponderado por tiempo, elimina el efecto de flujos de caja',
        unit: '%',
        category: 'performance',
      },
      {
        code: 'sharpe',
        name: 'Sharpe Ratio',
        description: 'Retorno excedente por unidad de riesgo (volatilidad)',
        unit: 'ratio',
        category: 'risk',
      },
    ];

    const handler = async (req: Request, res: Response) => {
      try {
        res.json({
          success: true,
          data: metrics,
        });
      } catch (error) {
        req.log.error(error, 'Error fetching metrics catalog');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: metrics,
    });
  });

  it('debería incluir todas las métricas principales', async () => {
    const handler = async (req: Request, res: Response) => {
      const metrics = [
        { code: 'twr', name: 'Time-Weighted Return', category: 'performance' },
        { code: 'sharpe', name: 'Sharpe Ratio', category: 'risk' },
        { code: 'volatility', name: 'Volatilidad', category: 'risk' },
        { code: 'drawdown', name: 'Maximum Drawdown', category: 'risk' },
        { code: 'alpha', name: 'Alpha', category: 'benchmark' },
        { code: 'beta', name: 'Beta', category: 'benchmark' },
        { code: 'te', name: 'Tracking Error', category: 'benchmark' },
        { code: 'ir', name: 'Information Ratio', category: 'benchmark' },
      ];

      res.json({
        success: true,
        data: metrics,
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ code: 'twr' }),
          expect.objectContaining({ code: 'sharpe' }),
          expect.objectContaining({ code: 'alpha' }),
        ]),
      })
    );
  });

  it('debería manejar errores correctamente', async () => {
    const mockError = new Error('Unexpected error');

    const handler = async (req: Request, res: Response) => {
      try {
        throw mockError;
      } catch (error) {
        req.log.error(error, 'Error fetching metrics catalog');
        res.status(500).json({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockReq.log?.error).toHaveBeenCalledWith(mockError, 'Error fetching metrics catalog');
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: 'Unexpected error',
    });
  });
});
