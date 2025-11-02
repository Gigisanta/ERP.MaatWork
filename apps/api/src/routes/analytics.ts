import express, { Request, Response } from 'express';
import { db } from '@cactus/db';
import { 
  users, 
  contacts, 
  aumSnapshots, 
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails,
  instruments,
  priceSnapshots,
  teamMembership,
  teams,
  benchmarkDefinitions,
  benchmarkComponents
} from '@cactus/db/schema';
import { eq, desc, and, gte, sql, count, sum, type InferSelectModel } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import fetch from 'node-fetch';
import { TIMEOUTS, getPortfolioCompareTimeout } from '../config/timeouts';

const router = express.Router();

// URL del microservicio Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

// D1 - Dashboard "one-glance" con KPIs según rol
router.get('/dashboard', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    type AumTrendItem = {
      date: string;
      totalAum: string | null;
    };
    
    type DashboardData = {
      role: string;
      kpis?: {
        totalAum: string | null;
        clientsWithPortfolio: number;
        deviationAlerts: number;
      };
      aumTrend?: Array<{ date: string; value: number }>;
    };
    
    let dashboardData: DashboardData = {
      role: user.role
    };

    if (user.role === 'advisor') {
      // KPIs para Advisor: AUM de clientes asignados, desvíos, tareas
      const [aumResult, clientCountResult, deviationAlertsResult] = await Promise.all([
        // AUM total de clientes asignados
        db().select({ 
          totalAum: sum(aumSnapshots.aumTotal) 
        })
        .from(aumSnapshots)
        .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
        .where(
          and(
            eq(contacts.assignedAdvisorId, user.id),
            eq(aumSnapshots.date, today.toISOString().split('T')[0])
          )
        ),

        // Número de clientes con cartera asignada
        db().select({ 
          count: count() 
        })
        .from(clientPortfolioAssignments)
        .innerJoin(contacts, eq(contacts.id, clientPortfolioAssignments.contactId))
        .where(
          and(
            eq(contacts.assignedAdvisorId, user.id),
            eq(clientPortfolioAssignments.status, 'active')
          )
        ),

        // Clientes con desvío >10% vs cartera objetivo
        db().select({ 
          count: count() 
        })
        .from(portfolioMonitoringSnapshot)
        .innerJoin(contacts, eq(contacts.id, portfolioMonitoringSnapshot.contactId))
        .where(
          and(
            eq(contacts.assignedAdvisorId, user.id),
            eq(portfolioMonitoringSnapshot.asOfDate, today.toISOString().split('T')[0]),
            sql`${portfolioMonitoringSnapshot.totalDeviationPct} > 10`
          )
        )
      ]);

      // Tendencias AUM últimos 30 días
      const aumTrend = await db().select({
        date: aumSnapshots.date,
        totalAum: sum(aumSnapshots.aumTotal)
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, user.id),
          gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0])
        )
      )
      .groupBy(aumSnapshots.date)
      .orderBy(aumSnapshots.date);

      dashboardData = {
        role: 'advisor',
        kpis: {
          totalAum: aumResult[0]?.totalAum || 0,
          clientsWithPortfolio: clientCountResult[0]?.count || 0,
          deviationAlerts: deviationAlertsResult[0]?.count || 0
        },
        aumTrend: aumTrend.map((item: AumTrendItem) => ({
          date: item.date,
          value: Number(item.totalAum) || 0
        }))
      };

    } else if (user.role === 'manager') {
      // KPIs para Manager: AUM del equipo, distribución de riesgo, top clientes
      const [teamAumResult, riskDistributionResult, topClientsResult] = await Promise.all([
        // AUM total del equipo
        db().select({ 
          totalAum: sum(aumSnapshots.aumTotal) 
        })
        .from(aumSnapshots)
        .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
        .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
        .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
        .innerJoin(teams, and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id)))
        .where(
          and(
            eq(aumSnapshots.date, today.toISOString().split('T')[0])
          )
        ),

        // Distribución de riesgo por clientes
        db().select({
          riskLevel: portfolioTemplates.riskLevel,
          count: count()
        })
        .from(contacts)
        .innerJoin(clientPortfolioAssignments, eq(clientPortfolioAssignments.contactId, contacts.id))
        .innerJoin(portfolioTemplates, eq(portfolioTemplates.id, clientPortfolioAssignments.templateId))
        .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
        .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
        .innerJoin(teams, and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id)))
        .where(
          and(
            eq(clientPortfolioAssignments.status, 'active')
          )
        )
        .groupBy(portfolioTemplates.riskLevel),

        // Top 5 clientes por AUM
        db().select({
          contactId: contacts.id,
          contactName: sql<string>`CONCAT(${contacts.firstName}, ' ', ${contacts.lastName})`,
          aum: aumSnapshots.aumTotal
        })
        .from(aumSnapshots)
        .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
        .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
        .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
        .innerJoin(teams, and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id)))
        .where(
          and(
            eq(aumSnapshots.date, today.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(aumSnapshots.aumTotal))
        .limit(5)
      ]);

      dashboardData = {
        role: 'manager',
        kpis: {
          teamAum: teamAumResult[0]?.totalAum || 0,
          riskDistribution: riskDistributionResult,
          topClients: topClientsResult
        }
      };

    } else if (user.role === 'admin') {
      // KPIs para Admin: AUM global, carteras activas, clientes sin cartera, instrumentos sin precio
      try {
        const [globalAumResult, activeTemplatesResult, clientsWithoutPortfolioResult, instrumentsWithoutPriceResult] = await Promise.all([
          // AUM global
          db().select({ 
            totalAum: sum(aumSnapshots.aumTotal) 
          })
          .from(aumSnapshots)
          .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

          // Número de carteras modelo activas
          db().select({ 
            count: count() 
          })
          .from(portfolioTemplates),

          // Clientes sin cartera asignada
          db().select({ 
            count: count() 
          })
          .from(contacts)
          .leftJoin(clientPortfolioAssignments, 
            and(
              eq(clientPortfolioAssignments.contactId, contacts.id),
              eq(clientPortfolioAssignments.status, 'active')
            )
          )
          .where(sql`${clientPortfolioAssignments.id} IS NULL`),

          // Instrumentos sin precio actualizado (últimas 48h)
          db().select({ 
            count: count() 
          })
          .from(instruments)
          .leftJoin(priceSnapshots, 
            and(
              eq(priceSnapshots.instrumentId, instruments.id),
              gte(priceSnapshots.asOfDate, new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            )
          )
          .where(
            and(
              eq(instruments.active, true),
              sql`${priceSnapshots.id} IS NULL`
            )
          )
        ]);

        dashboardData = {
          role: 'admin',
          kpis: {
            globalAum: globalAumResult[0]?.totalAum || 0,
            activeTemplates: activeTemplatesResult[0]?.count || 0,
            clientsWithoutPortfolio: clientsWithoutPortfolioResult[0]?.count || 0,
            instrumentsWithoutPrice: instrumentsWithoutPriceResult[0]?.count || 0
          }
        };
      } catch (dbError) {
        // Si hay error con price_snapshots, mostrar datos básicos
        const [globalAumResult, activeTemplatesResult, clientsWithoutPortfolioResult] = await Promise.all([
          db().select({ 
            totalAum: sum(aumSnapshots.aumTotal) 
          })
          .from(aumSnapshots)
          .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

          db().select({ 
            count: count() 
          })
          .from(portfolioTemplates),

          db().select({ 
            count: count() 
          })
          .from(contacts)
          .leftJoin(clientPortfolioAssignments, 
            and(
              eq(clientPortfolioAssignments.contactId, contacts.id),
              eq(clientPortfolioAssignments.status, 'active')
            )
          )
          .where(sql`${clientPortfolioAssignments.id} IS NULL`)
        ]);

        dashboardData = {
          role: 'admin',
          kpis: {
            globalAum: globalAumResult[0]?.totalAum || 0,
            activeTemplates: activeTemplatesResult[0]?.count || 0,
            clientsWithoutPortfolio: clientsWithoutPortfolioResult[0]?.count || 0,
            instrumentsWithoutPrice: 0 // No disponible si no hay tabla
          }
        };
      }
    }

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// D6 - Catálogo de métricas disponibles
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
    console.error('Error fetching metrics catalog:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /analytics/performance/:portfolioId - Obtener rendimiento de una cartera
// AI_DECISION: Usar servicio Python para cálculos profesionales de rendimiento
// Justificación: Aprovecha código existente en portfolio_performance.py con pandas/numpy
// Impacto: Cálculos más precisos, eliminación de código duplicado
router.get('/performance/:portfolioId', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { portfolioId } = req.params;
    const { period = '1Y' } = req.query;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validar período
    const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period. Valid periods: 1M, 3M, 6M, 1Y, YTD, ALL'
      });
    }

    // Obtener composición de la cartera y nombre
    const portfolioData = await db()
      .select({
        portfolioName: portfolioTemplates.name,
        instrumentId: portfolioTemplateLines.instrumentId,
        weight: portfolioTemplateLines.targetWeight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name
      })
      .from(portfolioTemplates)
      .innerJoin(portfolioTemplateLines, eq(portfolioTemplateLines.templateId, portfolioTemplates.id))
      .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
      .where(eq(portfolioTemplates.id, portfolioId))
      .limit(100); // Límite razonable de componentes

    if (portfolioData.length === 0) {
      return res.status(404).json({
        error: 'Portfolio not found or has no components'
      });
    }

    const portfolioName = portfolioData[0]?.portfolioName || `Portfolio ${portfolioId}`;

    // Preparar componentes para Python service
    const components = portfolioData.map((line: { instrumentSymbol: string; weight: string | number; instrumentName: string }) => ({
      symbol: line.instrumentSymbol,
      weight: Number(line.weight),
      name: line.instrumentName
    }));

      // Llamar al servicio Python para cálculo profesional
      // AI_DECISION: Timeout configurable vía env var
      // Justificación: Permite ajustar según carga/entorno sin redeploy
      // Impacto: Mejor configurabilidad y mantenibilidad
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUTS.PORTFOLIO_PERFORMANCE);

    try {
      const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/portfolio/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          portfolio_name: portfolioName,
          components,
          period: period as string
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!pythonResponse.ok) {
        throw new Error(`Python service error: ${pythonResponse.statusText}`);
      }

      const pythonData = await pythonResponse.json() as any;

      if (pythonData.status === 'success' && pythonData.data) {
        // Formatear respuesta compatible con frontend
        res.json({
          success: true,
          data: {
            portfolioId,
            portfolioName: pythonData.data.portfolio_name,
            period: pythonData.data.period,
            performance: pythonData.data.performance_series || [],
            metrics: {
              totalReturn: pythonData.data.total_return,
              annualizedReturn: pythonData.data.annualized_return,
              volatility: pythonData.data.volatility,
              sharpeRatio: pythonData.data.sharpe_ratio,
              maxDrawdown: pythonData.data.max_drawdown
            },
            components: components.map((c: { symbol: string; weight: number; name: string }) => ({
              symbol: c.symbol,
              name: c.name,
              weight: c.weight
            }))
          },
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Invalid response from Python service');
      }

    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        req.log.error({ portfolioId }, 'Timeout calling Python service for portfolio performance');
        return res.status(504).json({
          error: 'Service timeout',
          details: 'Portfolio performance calculation timed out'
        });
      }

      // Fallback: retornar error pero no crashear
      req.log.warn({ error: fetchError, portfolioId }, 'Error calling Python service, returning empty performance');
      
      return res.json({
        success: true,
        data: {
          portfolioId,
          period,
          message: 'No price data available or service unavailable',
          performance: []
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    req.log.error(error, 'Error fetching portfolio performance');
    res.status(500).json({
      error: 'Failed to fetch portfolio performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /analytics/compare - Comparar múltiples carteras/benchmarks
// AI_DECISION: Usar servicio Python para comparación profesional
// Justificación: Cálculos más precisos con pandas/numpy, normalización automática a base 100
// Impacto: Eliminación de código N+1 queries, mejor performance y precisión
router.post('/compare', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { portfolioIds = [], benchmarkIds = [], period = '1Y' } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (portfolioIds.length === 0 && benchmarkIds.length === 0) {
      return res.status(400).json({
        error: 'At least one portfolio or benchmark ID is required'
      });
    }

    const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Valid periods: 1M, 3M, 6M, 1Y, YTD, ALL'
      });
    }

    // Obtener datos de todas las carteras y benchmarks en paralelo
    interface PortfolioToCompare {
      id: string;
      name: string;
      type: 'portfolio' | 'benchmark';
      components: Array<{ symbol: string; weight: number; name: string }>;
    }
    const portfoliosToCompare: PortfolioToCompare[] = [];

    // Procesar carteras
    // Procesar portfolios - Batch query optimizada (1 query en lugar de N)
    if (portfolioIds.length > 0) {
      try {
        const allPortfolioData = await db()
          .select({
            portfolioId: portfolioTemplates.id,
            portfolioName: portfolioTemplates.name,
            instrumentSymbol: instruments.symbol,
            weight: portfolioTemplateLines.targetWeight,
            instrumentName: instruments.name
          })
          .from(portfolioTemplates)
          .innerJoin(portfolioTemplateLines, eq(portfolioTemplateLines.templateId, portfolioTemplates.id))
          .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
          .where(sql`${portfolioTemplates.id} = ANY(${portfolioIds})`);

        // Agrupar por portfolioId
        type PortfolioDataRow = {
          portfolioId: string;
          portfolioName: string;
          instrumentSymbol: string;
          weight: string | number;
          instrumentName: string;
        };
        
        const portfolioDataById: Record<string, PortfolioDataRow[]> = {};
        allPortfolioData.forEach((row: PortfolioDataRow) => {
          if (!portfolioDataById[row.portfolioId]) {
            portfolioDataById[row.portfolioId] = [];
          }
          portfolioDataById[row.portfolioId].push(row);
        });

        // Crear objetos de portfolio
        portfolioIds.forEach((portfolioId: string) => {
          const portfolioData = portfolioDataById[portfolioId];
          if (portfolioData && portfolioData.length > 0) {
            portfoliosToCompare.push({
              id: portfolioId,
              name: portfolioData[0]?.portfolioName || `Portfolio ${portfolioId}`,
              type: 'portfolio',
              components: portfolioData.map((line: PortfolioDataRow) => ({
                symbol: line.instrumentSymbol,
                weight: Number(line.weight),
                name: line.instrumentName
              }))
            });
          }
        });
      } catch (error) {
        req.log.warn({ error, portfolioIds }, 'Failed to fetch portfolio data');
      }
    }

    // Procesar benchmarks - Batch query optimizada (1 query en lugar de N)
    if (benchmarkIds.length > 0) {
      try {
        const allBenchmarkData = await db()
          .select({
            benchmarkId: benchmarkDefinitions.id,
            benchmarkName: benchmarkDefinitions.name,
            instrumentSymbol: instruments.symbol,
            weight: benchmarkComponents.weight,
            instrumentName: instruments.name
          })
          .from(benchmarkDefinitions)
          .innerJoin(benchmarkComponents, eq(benchmarkComponents.benchmarkId, benchmarkDefinitions.id))
          .innerJoin(instruments, eq(instruments.id, benchmarkComponents.instrumentId))
          .where(sql`${benchmarkDefinitions.id} = ANY(${benchmarkIds})`);

        // Agrupar por benchmarkId
        type BenchmarkDataRow = {
          benchmarkId: string;
          benchmarkName: string;
          instrumentSymbol: string;
          weight: string | number;
          instrumentName: string;
        };
        
        const benchmarkDataById: Record<string, BenchmarkDataRow[]> = {};
        allBenchmarkData.forEach((row: BenchmarkDataRow) => {
          if (!benchmarkDataById[row.benchmarkId]) {
            benchmarkDataById[row.benchmarkId] = [];
          }
          benchmarkDataById[row.benchmarkId].push(row);
        });

        // Crear objetos de benchmark
        benchmarkIds.forEach((benchmarkId: string) => {
          const benchmarkData = benchmarkDataById[benchmarkId];
          if (benchmarkData && benchmarkData.length > 0) {
            portfoliosToCompare.push({
              id: benchmarkId,
              name: benchmarkData[0]?.benchmarkName || `Benchmark ${benchmarkId}`,
              type: 'benchmark',
              components: benchmarkData.map((line: BenchmarkDataRow) => ({
                symbol: line.instrumentSymbol,
                weight: Number(line.weight),
                name: line.instrumentName
              }))
            });
          }
        });
      } catch (error) {
        req.log.warn({ error, benchmarkIds }, 'Failed to fetch benchmark data');
      }
    }

    if (portfoliosToCompare.length === 0) {
      return res.status(404).json({
        error: 'No valid portfolios or benchmarks found'
      });
    }

    // Llamar al servicio Python para comparación profesional
    // AI_DECISION: Timeout dinámico basado en cantidad de items
    // Justificación: Evita timeouts en comparaciones grandes, previene esperas excesivas en pequeñas
    // Impacto: Mejor UX y uso de recursos
    const dynamicTimeout = getPortfolioCompareTimeout(portfolioIds.length, benchmarkIds.length);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dynamicTimeout);

    try {
      const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/portfolio/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolios: portfoliosToCompare.map(p => ({
            id: p.id,
            name: p.name,
            components: p.components
          })),
          period: period as string
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!pythonResponse.ok) {
        throw new Error(`Python service error: ${pythonResponse.statusText}`);
      }

      const pythonData = await pythonResponse.json() as any;

      if (pythonData.status === 'success' && pythonData.data && pythonData.data.portfolios) {
        // Formatear respuesta compatible con frontend (normalizada a base 100)
        const results = Object.entries(pythonData.data.portfolios).map(([portfolioId, perfData]: [string, any]) => {
          const portfolioInfo = portfoliosToCompare.find(p => p.id === portfolioId);
          
          return {
            id: portfolioId,
            name: portfolioInfo?.name || `Portfolio ${portfolioId}`,
            type: portfolioInfo?.type || 'portfolio',
            performance: (perfData.performance_series || []).map((point: { date: string; value: number }) => ({
              date: point.date,
              value: point.value // Ya viene normalizado a base 100 desde Python
            })),
            metrics: {
              totalReturn: perfData.total_return,
              annualizedReturn: perfData.annualized_return,
              volatility: perfData.volatility,
              sharpeRatio: perfData.sharpe_ratio,
              maxDrawdown: perfData.max_drawdown
            }
          };
        });

        res.json({
          success: true,
          data: {
            period,
            results,
            count: results.length
          },
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Invalid response from Python service');
      }

    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        req.log.error({ portfolioIds, benchmarkIds }, 'Timeout calling Python service for portfolio comparison');
        return res.status(504).json({
          error: 'Service timeout',
          details: 'Portfolio comparison calculation timed out'
        });
      }

      // Fallback: retornar error pero no crashear
      req.log.warn({ error: fetchError }, 'Error calling Python service, returning empty comparison');
      
      return res.json({
        success: true,
        data: {
          period,
          results: [],
          count: 0,
          message: 'Service unavailable or no data available'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    req.log.error(error, 'Error comparing portfolios/benchmarks');
    res.status(500).json({
      error: 'Failed to compare portfolios/benchmarks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
