/**
 * Analytics Metrics Routes
 * 
 * Handles metrics catalog operations
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';

const router = Router();

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /analytics/metrics - Catálogo de métricas disponibles
 */
router.get('/metrics', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const metrics = [
      {
        code: 'twr',
        name: 'Time-Weighted Return',
        description: 'Retorno ponderado por tiempo, elimina el efecto de flujos de caja',
        unit: '%',
        category: 'performance'
      },
      {
        code: 'sharpe',
        name: 'Sharpe Ratio',
        description: 'Retorno excedente por unidad de riesgo (volatilidad)',
        unit: 'ratio',
        category: 'risk'
      },
      {
        code: 'volatility',
        name: 'Volatilidad',
        description: 'Desviación estándar de los retornos',
        unit: '%',
        category: 'risk'
      },
      {
        code: 'drawdown',
        name: 'Maximum Drawdown',
        description: 'Máxima pérdida desde un pico histórico',
        unit: '%',
        category: 'risk'
      },
      {
        code: 'alpha',
        name: 'Alpha',
        description: 'Retorno excedente vs benchmark (riesgo ajustado)',
        unit: '%',
        category: 'benchmark'
      },
      {
        code: 'beta',
        name: 'Beta',
        description: 'Sensibilidad de la cartera vs benchmark',
        unit: 'ratio',
        category: 'benchmark'
      },
      {
        code: 'te',
        name: 'Tracking Error',
        description: 'Desviación estándar de los retornos activos vs benchmark',
        unit: '%',
        category: 'benchmark'
      },
      {
        code: 'ir',
        name: 'Information Ratio',
        description: 'Retorno activo dividido por tracking error',
        unit: 'ratio',
        category: 'benchmark'
      }
    ];

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    req.log.error(error, 'Error fetching metrics catalog');
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

