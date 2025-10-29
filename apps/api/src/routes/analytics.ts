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
import { eq, desc, and, gte, sql, count, sum } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';

const router = express.Router();

// D1 - Dashboard "one-glance" con KPIs según rol
router.get('/dashboard', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let dashboardData: any = {};

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
        aumTrend: aumTrend.map((item: any) => ({
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

    // Obtener composición de la cartera
    const portfolioLines = await db()
      .select({
        instrumentId: portfolioTemplateLines.instrumentId,
        weight: portfolioTemplateLines.targetWeight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name
      })
      .from(portfolioTemplateLines)
      .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
      .where(eq(portfolioTemplateLines.templateId, portfolioId));

    if (portfolioLines.length === 0) {
      return res.status(404).json({
        error: 'Portfolio not found or has no components'
      });
    }

    // Calcular fechas según período
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case '1M':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'ALL':
        startDate = new Date('2020-01-01'); // Fecha arbitraria muy atrás
        break;
      default:
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Obtener precios históricos para los instrumentos
    const performanceData = [];
    const instrumentIds = portfolioLines.map((line: any) => line.instrumentId);

    for (const line of portfolioLines) {
      try {
        const prices = await db()
          .select({
            date: priceSnapshots.asOfDate,
            price: priceSnapshots.closePrice
          })
          .from(priceSnapshots)
          .where(
            and(
              eq(priceSnapshots.instrumentId, line.instrumentId),
              gte(priceSnapshots.asOfDate, startDate.toISOString().split('T')[0])
            )
          )
          .orderBy(priceSnapshots.asOfDate);

        if (prices.length > 0) {
          performanceData.push({
            instrumentId: line.instrumentId,
            symbol: line.instrumentSymbol,
            name: line.instrumentName,
            weight: Number(line.weight),
            prices: prices.map((p: any) => ({
              date: p.date,
              price: Number(p.price)
            }))
          });
        }
      } catch (error) {
        req.log.warn({ error, instrumentId: line.instrumentId }, 'Failed to get prices for instrument');
      }
    }

    if (performanceData.length === 0) {
      return res.json({
        success: true,
        data: {
          portfolioId,
          period,
          message: 'No price data available for this period',
          performance: []
        }
      });
    }

    // Calcular rendimiento de la cartera (simplificado)
    // En una implementación completa, esto se haría en Python con cálculos más sofisticados
    const portfolioPerformance = [];
    const allDates = new Set<string>();
    
    // Recopilar todas las fechas únicas
    performanceData.forEach((instrument: any) => {
      instrument.prices.forEach((price: any) => allDates.add(price.date));
    });

    const sortedDates = Array.from(allDates).sort();

    for (const date of sortedDates) {
      let portfolioValue = 0;
      let hasDataForAllInstruments = true;

      for (const instrument of performanceData) {
        const priceForDate = instrument.prices.find((p: any) => p.date === date);
        if (!priceForDate) {
          hasDataForAllInstruments = false;
          break;
        }
        portfolioValue += priceForDate.price * instrument.weight;
      }

      if (hasDataForAllInstruments) {
        portfolioPerformance.push({
          date,
          value: portfolioValue
        });
      }
    }

    res.json({
      success: true,
      data: {
        portfolioId,
        period,
        performance: portfolioPerformance,
        components: performanceData.map(instrument => ({
          symbol: instrument.symbol,
          name: instrument.name,
          weight: instrument.weight,
          priceCount: instrument.prices.length
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error fetching portfolio performance');
    res.status(500).json({
      error: 'Failed to fetch portfolio performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /analytics/compare - Comparar múltiples carteras/benchmarks
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
        error: 'Invalid period. Valid periods: 1M, 3M, 6M, 6Y, 1Y, YTD, ALL'
      });
    }

    // Calcular fechas según período
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case '1M':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'ALL':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const comparisonResults = [];

    // Procesar carteras
    for (const portfolioId of portfolioIds) {
      try {
        // Obtener composición de la cartera
        const portfolioLines = await db()
          .select({
            instrumentId: portfolioTemplateLines.instrumentId,
            weight: portfolioTemplateLines.targetWeight,
            instrumentSymbol: instruments.symbol
          })
          .from(portfolioTemplateLines)
          .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
          .where(eq(portfolioTemplateLines.templateId, portfolioId));

        if (portfolioLines.length === 0) continue;

        // Obtener nombre de la cartera
        const portfolio = await db()
          .select({ name: portfolioTemplates.name })
          .from(portfolioTemplates)
          .where(eq(portfolioTemplates.id, portfolioId))
          .limit(1);

        // Calcular rendimiento (simplificado)
        const portfolioPerformance = [];
        const allDates = new Set<string>();

        for (const line of portfolioLines) {
          const prices = await db()
            .select({
              date: priceSnapshots.asOfDate,
              price: priceSnapshots.closePrice
            })
            .from(priceSnapshots)
            .where(
              and(
                eq(priceSnapshots.instrumentId, line.instrumentId),
                gte(priceSnapshots.asOfDate, startDate.toISOString().split('T')[0])
              )
            )
            .orderBy(priceSnapshots.asOfDate);

          prices.forEach((price: any) => allDates.add(price.date));
        }

        const sortedDates = Array.from(allDates).sort();

        for (const date of sortedDates) {
          let portfolioValue = 0;
          let hasDataForAllInstruments = true;

          for (const line of portfolioLines) {
            const prices = await db()
              .select({ price: priceSnapshots.closePrice })
              .from(priceSnapshots)
              .where(
                and(
                  eq(priceSnapshots.instrumentId, line.instrumentId),
                  eq(priceSnapshots.asOfDate, date)
                )
              )
              .limit(1);

            if (prices.length === 0) {
              hasDataForAllInstruments = false;
              break;
            }

            portfolioValue += Number(prices[0].price) * Number(line.weight);
          }

          if (hasDataForAllInstruments) {
            portfolioPerformance.push({
              date,
              value: portfolioValue
            });
          }
        }

        if (portfolioPerformance.length > 0) {
          comparisonResults.push({
            id: portfolioId,
            name: portfolio[0]?.name || `Portfolio ${portfolioId}`,
            type: 'portfolio',
            performance: portfolioPerformance
          });
        }
      } catch (error) {
        req.log.warn({ error, portfolioId }, 'Failed to process portfolio for comparison');
      }
    }

    // Procesar benchmarks (simplificado - solo benchmarks individuales)
    for (const benchmarkId of benchmarkIds) {
      try {
        // Obtener información del benchmark
        const benchmark = await db()
          .select({
            name: benchmarkDefinitions.name,
            code: benchmarkDefinitions.code
          })
          .from(benchmarkDefinitions)
          .where(eq(benchmarkDefinitions.id, benchmarkId))
          .limit(1);

        if (benchmark.length === 0) continue;

        // Obtener componentes del benchmark
        const benchmarkComponentsData = await db()
          .select({
            instrumentId: benchmarkComponents.instrumentId,
            weight: benchmarkComponents.weight,
            instrumentSymbol: instruments.symbol
          })
          .from(benchmarkComponents)
          .innerJoin(instruments, eq(instruments.id, benchmarkComponents.instrumentId))
          .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

        if (benchmarkComponentsData.length === 0) continue;

        // Calcular rendimiento del benchmark (similar a carteras)
        const benchmarkPerformance = [];
        const allDates = new Set<string>();

        for (const component of benchmarkComponentsData) {
          const prices = await db()
            .select({
              date: priceSnapshots.asOfDate,
              price: priceSnapshots.closePrice
            })
            .from(priceSnapshots)
            .where(
              and(
                eq(priceSnapshots.instrumentId, component.instrumentId),
                gte(priceSnapshots.asOfDate, startDate.toISOString().split('T')[0])
              )
            )
            .orderBy(priceSnapshots.asOfDate);

          prices.forEach((price: any) => allDates.add(price.date));
        }

        const sortedDates = Array.from(allDates).sort();

        for (const date of sortedDates) {
          let benchmarkValue = 0;
          let hasDataForAllInstruments = true;

          for (const component of benchmarkComponentsData) {
            const prices = await db()
              .select({ price: priceSnapshots.closePrice })
              .from(priceSnapshots)
              .where(
                and(
                  eq(priceSnapshots.instrumentId, component.instrumentId),
                  eq(priceSnapshots.asOfDate, date)
                )
              )
              .limit(1);

            if (prices.length === 0) {
              hasDataForAllInstruments = false;
              break;
            }

            benchmarkValue += Number(prices[0].price) * Number(component.weight);
          }

          if (hasDataForAllInstruments) {
            benchmarkPerformance.push({
              date,
              value: benchmarkValue
            });
          }
        }

        if (benchmarkPerformance.length > 0) {
          comparisonResults.push({
            id: benchmarkId,
            name: benchmark[0]?.name || `Benchmark ${benchmarkId}`,
            type: 'benchmark',
            performance: benchmarkPerformance
          });
        }
      } catch (error) {
        req.log.warn({ error, benchmarkId }, 'Failed to process benchmark for comparison');
      }
    }

    // Normalizar series a base 100
    const normalizedResults = comparisonResults.map(result => {
      if (result.performance.length === 0) return result;

      const firstValue = result.performance[0].value;
      const normalizedPerformance = result.performance.map(point => ({
        date: point.date,
        value: firstValue > 0 ? (point.value / firstValue) * 100 : 100
      }));

      return {
        ...result,
        performance: normalizedPerformance
      };
    });

    res.json({
      success: true,
      data: {
        period,
        results: normalizedResults,
        count: normalizedResults.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    req.log.error(error, 'Error comparing portfolios/benchmarks');
    res.status(500).json({
      error: 'Failed to compare portfolios/benchmarks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
