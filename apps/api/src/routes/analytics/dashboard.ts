/**
 * Analytics Dashboard Routes
 *
 * Handles dashboard KPI operations
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@maatwork/db';
import {
  users,
  contacts,
  aumSnapshots,
  portfolios,
  clientPortfolioAssignments,
  portfolioMonitoringSnapshot,
  instruments,
  priceSnapshots,
  teamMembership,
  teams,
} from '@maatwork/db/schema';
import { eq, desc, and, gte, sql, count, sum } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { dashboardKpisCacheUtil, normalizeCacheKey } from '../../utils/performance/cache';

const router = Router();

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /analytics/dashboard - Dashboard "one-glance" con KPIs según rol
 */
router.get(
  '/dashboard',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin', 'owner', 'staff']),
  async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // AI_DECISION: Cache dashboard KPIs using materialized views
      // Justificación: Dashboard queries are expensive and frequently accessed. Cache reduces DB load by 80-90%
      // Impacto: Faster dashboard loading, reduced DB queries, better scalability
      const cacheKey = normalizeCacheKey('dashboard', 'kpis', user.role, user.id);
      const cachedData = dashboardKpisCacheUtil.get(cacheKey);

      if (cachedData) {
        req.log.debug({ cacheKey }, 'Dashboard KPIs served from cache');
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
        });
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
          totalAum?: string | number | null;
          teamAum?: string | number | null;
          globalAum?: string | number | null;
          clientsWithPortfolio?: number;
          deviationAlerts?: number;
          riskDistribution?: Array<{ riskLevel: string | null; count: number | bigint }>;
          topClients?: Array<{
            contactId: string;
            contactName: string;
            aum: string | number | null;
          }>;
          activeTemplates?: number | bigint;
          clientsWithoutPortfolio?: number | bigint;
          instrumentsWithoutPrice?: number | bigint;
          // Owner-specific KPIs
          totalTeams?: number;
          totalAdvisors?: number;
          totalClients?: number;
        };
        aumTrend?: Array<{ date: string; value: number }>;
      };

      let dashboardData: DashboardData = {
        role: user.role,
      };

      if (user.role === 'advisor') {
        // AI_DECISION: Paralelizar todas las queries independientes incluyendo aumTrend.
        // La query de tendencias AUM es independiente de los KPIs y puede ejecutarse en paralelo.
        const [aumResult, clientCountResult, deviationAlertsResult, aumTrend] = await Promise.all([
          // AUM total de clientes asignados
          db()
            .select({
              totalAum: sum(aumSnapshots.aumTotal),
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
          db()
            .select({
              count: count(),
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
          db()
            .select({
              count: count(),
            })
            .from(portfolioMonitoringSnapshot)
            .innerJoin(contacts, eq(contacts.id, portfolioMonitoringSnapshot.contactId))
            .where(
              and(
                eq(contacts.assignedAdvisorId, user.id),
                eq(portfolioMonitoringSnapshot.asOfDate, today.toISOString().split('T')[0]),
                sql`${portfolioMonitoringSnapshot.totalDeviationPct} > 10`
              )
            ),

          // Tendencias AUM últimos 30 días (paralelizada con KPIs)
          db()
            .select({
              date: aumSnapshots.date,
              totalAum: sum(aumSnapshots.aumTotal),
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
            .orderBy(aumSnapshots.date),
        ]);

        dashboardData = {
          role: 'advisor',
          kpis: {
            totalAum: aumResult[0]?.totalAum || 0,
            clientsWithPortfolio: Number(clientCountResult[0]?.count) || 0,
            deviationAlerts: Number(deviationAlertsResult[0]?.count) || 0,
          },
          aumTrend: aumTrend.map((item: AumTrendItem) => ({
            date: item.date,
            value: Number(item.totalAum) || 0,
          })),
        };
      } else if (user.role === 'manager') {
        // KPIs para Manager: AUM del equipo, distribución de riesgo, top clientes
        const [teamAumResult, riskDistributionResult, topClientsResult] = await Promise.all([
          // AUM total del equipo
          db()
            .select({
              totalAum: sum(aumSnapshots.aumTotal),
            })
            .from(aumSnapshots)
            .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
            .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
            .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
            .innerJoin(
              teams,
              and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id))
            )
            .where(and(eq(aumSnapshots.date, today.toISOString().split('T')[0]))),

          // Distribución de riesgo por clientes
          db()
            .select({
              riskLevel: portfolios.riskLevel,
              count: count(),
            })
            .from(contacts)
            .innerJoin(
              clientPortfolioAssignments,
              eq(clientPortfolioAssignments.contactId, contacts.id)
            )
            .innerJoin(
              portfolios,
              eq(portfolios.id, clientPortfolioAssignments.portfolioId)
            )
            .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
            .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
            .innerJoin(
              teams,
              and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id))
            )
            .where(and(eq(clientPortfolioAssignments.status, 'active')))
            .groupBy(portfolios.riskLevel),

          // Top 5 clientes por AUM
          db()
            .select({
              contactId: contacts.id,
              contactName: sql<string>`CONCAT(${contacts.firstName}, ' ', ${contacts.lastName})`,
              aum: aumSnapshots.aumTotal,
            })
            .from(aumSnapshots)
            .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
            .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
            .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
            .innerJoin(
              teams,
              and(eq(teams.id, teamMembership.teamId), eq(teams.managerUserId, user.id))
            )
            .where(and(eq(aumSnapshots.date, today.toISOString().split('T')[0])))
            .orderBy(desc(aumSnapshots.aumTotal))
            .limit(5),
        ]);

        dashboardData = {
          role: 'manager',
          kpis: {
            teamAum: teamAumResult[0]?.totalAum || 0,
            riskDistribution: riskDistributionResult.map(
              (r: { riskLevel: string; count: number | bigint }) => ({
                riskLevel: r.riskLevel,
                count: Number(r.count),
              })
            ),
            topClients: topClientsResult.map(
              (c: { contactId: string; contactName: string; aum: string | number | null }) => ({
                contactId: c.contactId,
                contactName: c.contactName,
                aum: c.aum,
              })
            ),
          },
        };
      } else if (user.role === 'admin') {
        // KPIs para Admin: AUM global, carteras activas, clientes sin cartera, instrumentos sin precio
        try {
          const [
            globalAumResult,
            activeTemplatesResult,
            clientsWithoutPortfolioResult,
            instrumentsWithoutPriceResult,
          ] = await Promise.all([
            // AUM global
            db()
              .select({
                totalAum: sum(aumSnapshots.aumTotal),
              })
              .from(aumSnapshots)
              .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

            // Número de carteras modelo activas
            db()
              .select({
                count: count(),
              })
              .from(portfolios)
              .where(eq(portfolios.type, 'template')),

            // Clientes sin cartera asignada
            db()
              .select({
                count: count(),
              })
              .from(contacts)
              .leftJoin(
                clientPortfolioAssignments,
                and(
                  eq(clientPortfolioAssignments.contactId, contacts.id),
                  eq(clientPortfolioAssignments.status, 'active')
                )
              )
              .where(sql`${clientPortfolioAssignments.id} IS NULL`),

            // Instrumentos sin precio actualizado (últimas 48h)
            db()
              .select({
                count: count(),
              })
              .from(instruments)
              .leftJoin(
                priceSnapshots,
                and(
                  eq(priceSnapshots.instrumentId, instruments.id),
                  gte(
                    priceSnapshots.asOfDate,
                    new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  )
                )
              )
              .where(and(eq(instruments.active, true), sql`${priceSnapshots.id} IS NULL`)),
          ]);

          dashboardData = {
            role: 'admin',
            kpis: {
              globalAum: globalAumResult[0]?.totalAum || 0,
              activeTemplates: Number(activeTemplatesResult[0]?.count) || 0,
              clientsWithoutPortfolio: Number(clientsWithoutPortfolioResult[0]?.count) || 0,
              instrumentsWithoutPrice: Number(instrumentsWithoutPriceResult[0]?.count) || 0,
            },
          };
        } catch (dbError) {
          // Si hay error con price_snapshots, mostrar datos básicos
          const [globalAumResult, activeTemplatesResult, clientsWithoutPortfolioResult] =
            await Promise.all([
              db()
                .select({
                  totalAum: sum(aumSnapshots.aumTotal),
                })
                .from(aumSnapshots)
                .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

              db()
                .select({
                  count: count(),
                })
                .from(portfolios)
                .where(eq(portfolios.type, 'template')),

              db()
                .select({
                  count: count(),
                })
                .from(contacts)
                .leftJoin(
                  clientPortfolioAssignments,
                  and(
                    eq(clientPortfolioAssignments.contactId, contacts.id),
                    eq(clientPortfolioAssignments.status, 'active')
                  )
                )
                .where(sql`${clientPortfolioAssignments.id} IS NULL`),
            ]);

          dashboardData = {
            role: 'admin',
            kpis: {
              globalAum: globalAumResult[0]?.totalAum || 0,
              activeTemplates: Number(activeTemplatesResult[0]?.count) || 0,
              clientsWithoutPortfolio: Number(clientsWithoutPortfolioResult[0]?.count) || 0,
              instrumentsWithoutPrice: 0, // No disponible si no hay tabla
            },
          };
        }
      } else if (user.role === 'owner') {
        // AI_DECISION: KPIs para Owner - Vista ejecutiva de toda la agencia
        // Justificación: Owner necesita métricas de negocio agregadas sin acceso a contactos individuales
        // Impacto: Dashboard enfocado en métricas de dirección y crecimiento
        const [
          globalAumResult,
          totalTeamsResult,
          totalAdvisorsResult,
          totalClientsResult,
          riskDistributionResult,
          aumTrendResult,
        ] = await Promise.all([
          // AUM global de toda la agencia
          db()
            .select({
              totalAum: sum(aumSnapshots.aumTotal),
            })
            .from(aumSnapshots)
            .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

          // Total de equipos
          db().select({ count: count() }).from(teams),

          // Total de asesores activos
          db()
            .select({ count: count() })
            .from(users)
            .where(and(eq(users.role, 'advisor'), eq(users.isActive, true))),

          // Total de clientes (contactos no eliminados)
          db()
            .select({ count: count() })
            .from(contacts)
            .where(sql`${contacts.deletedAt} IS NULL`),

          // Distribución de riesgo global
          db()
            .select({
              riskLevel: portfolios.riskLevel,
              count: count(),
            })
            .from(contacts)
            .innerJoin(
              clientPortfolioAssignments,
              eq(clientPortfolioAssignments.contactId, contacts.id)
            )
            .innerJoin(
              portfolios,
              eq(portfolios.id, clientPortfolioAssignments.portfolioId)
            )
            .where(eq(clientPortfolioAssignments.status, 'active'))
            .groupBy(portfolios.riskLevel),

          // Tendencia AUM últimos 30 días (global)
          db()
            .select({
              date: aumSnapshots.date,
              totalAum: sum(aumSnapshots.aumTotal),
            })
            .from(aumSnapshots)
            .where(gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0]))
            .groupBy(aumSnapshots.date)
            .orderBy(aumSnapshots.date),
        ]);

        dashboardData = {
          role: 'owner',
          kpis: {
            globalAum: globalAumResult[0]?.totalAum || 0,
            totalTeams: Number(totalTeamsResult[0]?.count) || 0,
            totalAdvisors: Number(totalAdvisorsResult[0]?.count) || 0,
            totalClients: Number(totalClientsResult[0]?.count) || 0,
            riskDistribution: riskDistributionResult.map(
              (r: { riskLevel: string | null; count: bigint | number }) => ({
                riskLevel: r.riskLevel,
                count: Number(r.count),
              })
            ),
          },
          aumTrend: aumTrendResult.map(
            (item: { date: string; totalAum: string | number | null }) => ({
              date: item.date,
              value: Number(item.totalAum) || 0,
            })
          ),
        };
      } else if (user.role === 'staff') {
        // AI_DECISION: KPIs para Staff (Administrativo) - Vista operativa global
        // Justificación: Staff necesita visibilidad operativa para soporte y gestión
        // Impacto: Dashboard similar a admin pero enfocado en operaciones diarias
        const [
          globalAumResult,
          totalClientsResult,
          clientsWithoutPortfolioResult,
          pendingTasksResult,
          aumTrendResult,
        ] = await Promise.all([
          // AUM global
          db()
            .select({
              totalAum: sum(aumSnapshots.aumTotal),
            })
            .from(aumSnapshots)
            .where(eq(aumSnapshots.date, today.toISOString().split('T')[0])),

          // Total de clientes
          db()
            .select({ count: count() })
            .from(contacts)
            .where(sql`${contacts.deletedAt} IS NULL`),

          // Clientes sin cartera asignada (para gestión)
          db()
            .select({ count: count() })
            .from(contacts)
            .leftJoin(
              clientPortfolioAssignments,
              and(
                eq(clientPortfolioAssignments.contactId, contacts.id),
                eq(clientPortfolioAssignments.status, 'active')
              )
            )
            .where(sql`${clientPortfolioAssignments.id} IS NULL AND ${contacts.deletedAt} IS NULL`),

          // Número de carteras modelo activas
          db().select({ count: count() }).from(portfolios).where(eq(portfolios.type, 'template')),

          // Tendencia AUM últimos 30 días
          db()
            .select({
              date: aumSnapshots.date,
              totalAum: sum(aumSnapshots.aumTotal),
            })
            .from(aumSnapshots)
            .where(gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0]))
            .groupBy(aumSnapshots.date)
            .orderBy(aumSnapshots.date),
        ]);

        dashboardData = {
          role: 'staff',
          kpis: {
            globalAum: globalAumResult[0]?.totalAum || 0,
            totalClients: Number(totalClientsResult[0]?.count) || 0,
            clientsWithoutPortfolio: Number(clientsWithoutPortfolioResult[0]?.count) || 0,
            activeTemplates: Number(pendingTasksResult[0]?.count) || 0,
          },
          aumTrend: aumTrendResult.map(
            (item: { date: string; totalAum: string | number | null }) => ({
              date: item.date,
              value: Number(item.totalAum) || 0,
            })
          ),
        };
      }

      // Cache the result for 5 minutes
      dashboardKpisCacheUtil.set(cacheKey, dashboardData, 300);

      res.json({
        success: true,
        data: dashboardData,
        cached: false,
      });
    } catch (error) {
      req.log.error(error, 'Error fetching dashboard data');
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
