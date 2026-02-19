/**
 * Teams Metrics Handlers
 *
 * GET /teams/:id/detail - Get team with details and metrics
 * GET /teams/:id/metrics - Get team metrics
 * GET /teams/:id/members/:memberId/metrics - Get member metrics
 * GET /teams/:id/members-activity - Get activity metrics for all team members
 * GET /teams/:id/history - Get monthly history metrics
 */
import type { Request } from 'express';
import { db, teamMembership, users, pipelineStages, pipelineStageHistory } from '@maatwork/db';
import {
  contacts,
  aumSnapshots,
  clientPortfolioAssignments,
  portfolios,
  portfolioMonitoringSnapshot,
  notes,
  tasks,
} from '@maatwork/db/schema';
import { eq, and, sum, count, gte, sql, inArray } from 'drizzle-orm';
import { getUserTeams } from '../../../auth/authorization';
import { teamMetricsCacheUtil, normalizeCacheKey } from '../../../utils/performance/cache';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';

/**
 * Calculate days since a date
 */
function calculateDaysSince(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diffTime = now.getTime() - new Date(date).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine activity status based on days since login
 * - active: logged in within last 3 days
 * - moderate: logged in within last 7 days
 * - inactive: logged in within last 14 days
 * - critical: more than 14 days without login
 */
function getActivityStatus(
  daysSinceLogin: number | null
): 'active' | 'moderate' | 'inactive' | 'critical' {
  if (daysSinceLogin === null) return 'critical';
  if (daysSinceLogin <= 3) return 'active';
  if (daysSinceLogin <= 7) return 'moderate';
  if (daysSinceLogin <= 14) return 'inactive';
  return 'critical';
}

/**
 * GET /teams/:id/metrics - Obtener métricas del equipo
 */
export const getTeamMetrics = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view team metrics.');
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // AI_DECISION: Use cache + materialized view for team metrics
  // Justificación: Caching reduces DB load, materialized view pre-calculates metrics
  // Impacto: 70-90% reduction in query time for team metrics
  const cacheKey = normalizeCacheKey('team', 'metrics', id);
  const cachedResult = teamMetricsCacheUtil.get(cacheKey);

  let basicMetricsResult: {
    rows: Array<{ memberCount: number; clientCount: number; portfolioCount: number }>;
  };

  if (cachedResult) {
    req.log.info({ cacheKey }, 'Serving team metrics from cache');
    basicMetricsResult = {
      rows: [cachedResult as { memberCount: number; clientCount: number; portfolioCount: number }],
    };
  } else {
    // AI_DECISION: Try materialized view first, fallback to direct query if MV doesn't exist
    // Justificación: Resilience - code works even if migration hasn't been applied
    // Impacto: Graceful degradation with slightly slower queries when MV is missing
    try {
      const result = await db().execute(sql`
            SELECT 
              member_count AS "memberCount",
              client_count AS "clientCount",
              portfolio_count AS "portfolioCount"
            FROM mv_team_metrics_daily
            WHERE team_id = ${id}
          `);
      basicMetricsResult = result;

      // Cache the result
      if (result.rows.length > 0) {
        teamMetricsCacheUtil.set(cacheKey, result.rows[0]);
      }
    } catch (mvError) {
      // Fallback: Calculate metrics directly if materialized view doesn't exist (code 42P01)
      const pgError = mvError as { code?: string };
      if (pgError.code === '42P01') {
        req.log.warn('mv_team_metrics_daily not found, using fallback query');
        const fallbackResult = await db().execute(sql`
              SELECT 
                COUNT(DISTINCT tm.user_id) AS "memberCount",
                COUNT(DISTINCT CASE WHEN c.deleted_at IS NULL THEN c.id END) AS "clientCount",
                COUNT(DISTINCT CASE WHEN cpa.status = 'active' THEN cpa.id END) AS "portfolioCount"
              FROM teams t
              LEFT JOIN team_membership tm ON t.id = tm.team_id
              LEFT JOIN users u ON tm.user_id = u.id
              LEFT JOIN contacts c ON c.assigned_advisor_id = u.id AND c.deleted_at IS NULL
              LEFT JOIN client_portfolio_assignments cpa ON cpa.contact_id = c.id AND cpa.status = 'active'
              WHERE t.id = ${id}
              GROUP BY t.id
            `);
        basicMetricsResult = fallbackResult;

        if (fallbackResult.rows.length > 0) {
          teamMetricsCacheUtil.set(cacheKey, fallbackResult.rows[0]);
        }
      } else {
        throw mvError;
      }
    }
  }

  // Execute remaining queries in parallel (AUM queries need separate handling due to date filters)
  const [aumResult, riskDistributionResult, aumTrendResult] = await Promise.all([
    // Get AUM total del equipo
    db()
      .select({
        totalAum: sum(aumSnapshots.aumTotal),
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(and(eq(teamMembership.teamId, id), eq(aumSnapshots.date, todayStr)))
      .limit(1),

    // Get risk distribution
    db()
      .select({
        riskLevel: portfolios.riskLevel,
        count: count(),
      })
      .from(contacts)
      .innerJoin(clientPortfolioAssignments, eq(clientPortfolioAssignments.contactId, contacts.id))
      .innerJoin(
        portfolios,
        eq(portfolios.id, clientPortfolioAssignments.portfolioId)
      )
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(and(eq(teamMembership.teamId, id), eq(clientPortfolioAssignments.status, 'active')))
      .groupBy(portfolios.riskLevel),

    // Get AUM trend (last 30 days)
    db()
      .select({
        date: aumSnapshots.date,
        totalAum: sum(aumSnapshots.aumTotal),
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(and(eq(teamMembership.teamId, id), gte(aumSnapshots.date, thirtyDaysAgoStr)))
      .groupBy(aumSnapshots.date)
      .orderBy(aumSnapshots.date),
  ]);

  return {
    teamAum: aumResult[0]?.totalAum ? Number(aumResult[0].totalAum) : 0,
    memberCount: basicMetricsResult.rows[0]?.memberCount || 0,
    clientCount: basicMetricsResult.rows[0]?.clientCount || 0,
    portfolioCount: basicMetricsResult.rows[0]?.portfolioCount || 0,
    riskDistribution: riskDistributionResult.map(
      (r: { riskLevel: string | null; count: bigint | number }) => ({
        riskLevel: r.riskLevel,
        count: Number(r.count),
      })
    ),
    aumTrend: aumTrendResult.map((r: { date: string; totalAum: bigint | number | null }) => ({
      date: r.date,
      value: r.totalAum ? Number(r.totalAum) : 0,
    })),
  };
});

/**
 * GET /teams/:id/members/:memberId/metrics - Obtener métricas del miembro
 *
 * AI_DECISION: Extender métricas con información de actividad del usuario
 * Justificación: Managers necesitan visibilidad sobre la actividad de sus asesores
 * Impacto: Mejor control y seguimiento del trabajo del equipo
 */
export const getMemberMetrics = createRouteHandler(async (req: Request) => {
  const { id, memberId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view member metrics.');
  }

  // Verify member belongs to this team
  const [memberCheck] = await db()
    .select()
    .from(teamMembership)
    .where(and(eq(teamMembership.teamId, id), eq(teamMembership.userId, memberId)))
    .limit(1);

  if (!memberCheck) {
    throw new HttpError(404, 'Member not found in this team');
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get pipeline stage IDs
  const stages = await db()
    .select({ id: pipelineStages.id, name: pipelineStages.name })
    .from(pipelineStages)
    .where(inArray(pipelineStages.name, ['Primera reunion', 'Segunda reunion']));

  const firstMeetingStageId = stages.find(
    (s: { id: string; name: string | null }) => s.name === 'Primera reunion'
  )?.id;
  const secondMeetingStageId = stages.find(
    (s: { id: string; name: string | null }) => s.name === 'Segunda reunion'
  )?.id;

  // Execute all queries in parallel for better performance
  const [
    userInfo,
    aumResult,
    clientCountResult,
    portfolioCountResult,
    deviationAlertsResult,
    aumTrendResult,
    contactsThisMonth,
    contactsLast30Days,
    firstMeetingsLast30Days,
    secondMeetingsLast30Days,
    tasksCompletedLast30Days,
  ] = await Promise.all([
    // Get user info including lastLogin
    db()
      .select({
        lastLogin: users.lastLogin,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, memberId))
      .limit(1),

    // Get AUM total del asesor
    db()
      .select({
        totalAum: sum(aumSnapshots.aumTotal),
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(aumSnapshots.date, today.toISOString().split('T')[0])
        )
      ),

    // Get client count
    db()
      .select({ count: count() })
      .from(contacts)
      .where(and(eq(contacts.assignedAdvisorId, memberId), sql`${contacts.deletedAt} IS NULL`)),

    // Get portfolios count
    db()
      .select({ count: count() })
      .from(clientPortfolioAssignments)
      .innerJoin(contacts, eq(contacts.id, clientPortfolioAssignments.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(clientPortfolioAssignments.status, 'active')
        )
      ),

    // Get deviation alerts count
    db()
      .select({ count: count() })
      .from(portfolioMonitoringSnapshot)
      .innerJoin(contacts, eq(contacts.id, portfolioMonitoringSnapshot.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(portfolioMonitoringSnapshot.asOfDate, today.toISOString().split('T')[0]),
          sql`${portfolioMonitoringSnapshot.totalDeviationPct} > 10`
        )
      ),

    // Get AUM trend (last 30 days)
    db()
      .select({
        date: aumSnapshots.date,
        totalAum: sum(aumSnapshots.aumTotal),
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0])
        )
      )
      .groupBy(aumSnapshots.date)
      .orderBy(aumSnapshots.date),

    // Contacts created this month
    db()
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          sql`${contacts.deletedAt} IS NULL`,
          gte(contacts.createdAt, monthStart)
        )
      ),

    // Contacts created last 30 days
    db()
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          sql`${contacts.deletedAt} IS NULL`,
          gte(contacts.createdAt, thirtyDaysAgo)
        )
      ),

    // First Meetings last 30 days
    // Count contacts that entered 'Primera reunion' stage in last 30 days
    firstMeetingStageId
      ? db()
          .select({ count: count(sql`DISTINCT ${pipelineStageHistory.contactId}`) })
          .from(pipelineStageHistory)
          .innerJoin(contacts, eq(contacts.id, pipelineStageHistory.contactId))
          .where(
            and(
              eq(contacts.assignedAdvisorId, memberId),
              eq(pipelineStageHistory.toStage, firstMeetingStageId),
              gte(pipelineStageHistory.changedAt, thirtyDaysAgo)
            )
          )
      : Promise.resolve([{ count: 0 }]),

    // Second Meetings last 30 days
    secondMeetingStageId
      ? db()
          .select({ count: count(sql`DISTINCT ${pipelineStageHistory.contactId}`) })
          .from(pipelineStageHistory)
          .innerJoin(contacts, eq(contacts.id, pipelineStageHistory.contactId))
          .where(
            and(
              eq(contacts.assignedAdvisorId, memberId),
              eq(pipelineStageHistory.toStage, secondMeetingStageId),
              gte(pipelineStageHistory.changedAt, thirtyDaysAgo)
            )
          )
      : Promise.resolve([{ count: 0 }]),

    // Tasks completed last 30 days
    db()
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedToUserId, memberId),
          eq(tasks.status, 'completed'),
          sql`${tasks.deletedAt} IS NULL`,
          gte(tasks.completedAt, thirtyDaysAgo)
        )
      ),
  ]);

  const lastLogin = userInfo[0]?.lastLogin || null;
  const daysSinceLogin = calculateDaysSince(lastLogin);

  return {
    totalAum: aumResult[0]?.totalAum ? Number(aumResult[0].totalAum) : 0,
    clientCount: clientCountResult[0]?.count || 0,
    portfolioCount: portfolioCountResult[0]?.count || 0,
    deviationAlerts: deviationAlertsResult[0]?.count || 0,
    aumTrend: aumTrendResult.map((r: { date: string; totalAum: bigint | number | null }) => ({
      date: r.date,
      value: r.totalAum ? Number(r.totalAum) : 0,
    })),
    // Activity metrics
    lastLogin: lastLogin ? lastLogin.toISOString() : null,
    daysSinceLogin,
    contactsCreatedThisMonth: contactsThisMonth[0]?.count || 0,
    contactsCreatedLast30Days: contactsLast30Days[0]?.count || 0,
    firstMeetingsLast30Days: Number(firstMeetingsLast30Days[0]?.count || 0),
    secondMeetingsLast30Days: Number(secondMeetingsLast30Days[0]?.count || 0),
    notesCreatedLast30Days: 0, // Deprecated
    tasksCompletedLast30Days: tasksCompletedLast30Days[0]?.count || 0,
  };
});

/**
 * GET /teams/:id/members-activity - Obtener resumen de actividad de todos los miembros
 *
 * AI_DECISION: Endpoint dedicado para control de actividad del equipo
 * Justificación: Permite a managers ver rápidamente qué asesores están activos o inactivos
 * Impacto: Vista consolidada de actividad, mejor gestión del equipo
 */
export const getTeamMembersActivity = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view team activity.');
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get pipeline stage IDs for team activity query
  const stages = await db()
    .select({ id: pipelineStages.id, name: pipelineStages.name })
    .from(pipelineStages)
    .where(inArray(pipelineStages.name, ['Primera reunion', 'Segunda reunion']));

  const firstMeetingStageId = stages.find(
    (s: { id: string; name: string | null }) => s.name === 'Primera reunion'
  )?.id;
  const secondMeetingStageId = stages.find(
    (s: { id: string; name: string | null }) => s.name === 'Segunda reunion'
  )?.id;

  // Get all team members with their activity metrics
  const membersWithActivity = await db().execute(sql`
      WITH member_metrics AS (
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.last_login,
          u.is_active,
          tm.role as team_role,
          -- Contacts created this month
          (
            SELECT COUNT(*) 
            FROM contacts c 
            WHERE c.assigned_advisor_id = u.id 
              AND c.deleted_at IS NULL 
              AND c.created_at >= ${monthStart}
          ) as contacts_created_this_month,
          -- Contacts created last 30 days
          (
            SELECT COUNT(*) 
            FROM contacts c 
            WHERE c.assigned_advisor_id = u.id 
              AND c.deleted_at IS NULL 
              AND c.created_at >= ${thirtyDaysAgo}
          ) as contacts_created_last_30_days,
          -- First Meetings last 30 days
          (
            SELECT COUNT(DISTINCT psh.contact_id)
            FROM pipeline_stage_history psh
            INNER JOIN contacts c ON c.id = psh.contact_id
            WHERE c.assigned_advisor_id = u.id 
              AND psh.to_stage = ${firstMeetingStageId}
              AND psh.changed_at >= ${thirtyDaysAgo}
          ) as first_meetings_last_30_days,
          -- Second Meetings last 30 days
          (
            SELECT COUNT(DISTINCT psh.contact_id)
            FROM pipeline_stage_history psh
            INNER JOIN contacts c ON c.id = psh.contact_id
            WHERE c.assigned_advisor_id = u.id 
              AND psh.to_stage = ${secondMeetingStageId}
              AND psh.changed_at >= ${thirtyDaysAgo}
          ) as second_meetings_last_30_days,
          -- Tasks completed last 30 days
          (
            SELECT COUNT(*) 
            FROM tasks t 
            WHERE t.assigned_to_user_id = u.id 
              AND t.status = 'completed' 
              AND t.deleted_at IS NULL
              AND t.completed_at >= ${thirtyDaysAgo}
          ) as tasks_completed_last_30_days,
          -- Open Tasks (Pending)
          (
            SELECT COUNT(*) 
            FROM tasks t 
            WHERE t.assigned_to_user_id = u.id 
              AND t.status = 'pending' 
              AND t.deleted_at IS NULL
          ) as open_tasks,
          -- Client count
          (
            SELECT COUNT(*) 
            FROM contacts c 
            WHERE c.assigned_advisor_id = u.id 
              AND c.deleted_at IS NULL
          ) as client_count,
          -- Total AUM
          (
            SELECT COALESCE(SUM(aum.aum_total), 0)
            FROM aum_snapshots aum
            INNER JOIN contacts c ON c.id = aum.contact_id
            WHERE c.assigned_advisor_id = u.id
              AND aum.date = ${today.toISOString().split('T')[0]}
          ) as total_aum
        FROM users u
        INNER JOIN team_membership tm ON tm.user_id = u.id
        WHERE tm.team_id = ${id}
      )
      SELECT * FROM member_metrics
      ORDER BY last_login DESC NULLS LAST
    `);

  const membersActivity = membersWithActivity.rows.map((member: Record<string, unknown>) => {
    // Raw SQL returns dates as strings, convert to Date if present
    const lastLoginRaw = member.last_login;
    const lastLogin = lastLoginRaw ? new Date(lastLoginRaw as string) : null;
    const daysSinceLogin = calculateDaysSince(lastLogin);

    return {
      id: member.id as string,
      email: member.email as string,
      fullName: member.full_name as string,
      role: member.team_role as string,
      lastLogin: lastLogin ? lastLogin.toISOString() : null,
      daysSinceLogin,
      isActive: member.is_active as boolean,
      contactsCreatedThisMonth: Number(member.contacts_created_this_month) || 0,
      contactsCreatedLast30Days: Number(member.contacts_created_last_30_days) || 0,
      firstMeetingsLast30Days: Number(member.first_meetings_last_30_days) || 0,
      secondMeetingsLast30Days: Number(member.second_meetings_last_30_days) || 0,
      notesCreatedLast30Days: 0, // Deprecated
      tasksCompletedLast30Days: Number(member.tasks_completed_last_30_days) || 0,
      openTasks: Number(member.open_tasks) || 0,
      clientCount: Number(member.client_count) || 0,
      totalAum: Number(member.total_aum) || 0,
      activityStatus: getActivityStatus(daysSinceLogin),
    };
  });

  // Calculate summary stats
  type MemberActivity = (typeof membersActivity)[number];
  const summary = {
    totalMembers: membersActivity.length,
    activeMembers: membersActivity.filter((m: MemberActivity) => m.activityStatus === 'active')
      .length,
    moderateMembers: membersActivity.filter((m: MemberActivity) => m.activityStatus === 'moderate')
      .length,
    inactiveMembers: membersActivity.filter((m: MemberActivity) => m.activityStatus === 'inactive')
      .length,
    criticalMembers: membersActivity.filter((m: MemberActivity) => m.activityStatus === 'critical')
      .length,
    totalContactsCreatedThisMonth: membersActivity.reduce(
      (acc: number, m: MemberActivity) => acc + m.contactsCreatedThisMonth,
      0
    ),
    totalFirstMeetingsLast30Days: membersActivity.reduce(
      (acc: number, m: MemberActivity) => acc + m.firstMeetingsLast30Days,
      0
    ),
  };

  return {
    members: membersActivity,
    summary,
  };
});

/**
 * GET /teams/:id/history - Obtener historial de métricas (últimos 12 meses)
 *
 * Muestra evolución de:
 * - Nuevos clientes
 * - AUM Total
 */
export const getTeamHistory = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view team history.');
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1); // Start of month 12 months ago

  // Use SQL to aggregate by month
  const result = await db().execute(sql`
      WITH months AS (
          SELECT generate_series(
              date_trunc('month', ${twelveMonthsAgo.toISOString()}::date),
              date_trunc('month', CURRENT_DATE),
              '1 month'
          ) as month_start
      ),
      team_advisors AS (
          SELECT user_id FROM team_membership WHERE team_id = ${id}
      )
      SELECT
          to_char(m.month_start, 'YYYY-MM') as month,
          -- New Clients count
          (
              SELECT COUNT(*)
              FROM contacts c
              WHERE c.assigned_advisor_id IN (SELECT user_id FROM team_advisors)
              AND date_trunc('month', c.created_at) = m.month_start
              AND c.deleted_at IS NULL
          ) as "newClients",
          -- AUM Average for the month
          COALESCE((
              SELECT AVG(daily_sum)
              FROM (
                  SELECT date, SUM(aum_total) as daily_sum
                  FROM aum_snapshots s
                  JOIN contacts c ON s.contact_id = c.id
                  WHERE c.assigned_advisor_id IN (SELECT user_id FROM team_advisors)
                  AND date_trunc('month', s.date) = m.month_start
                  GROUP BY date
              ) as daily_sums
          ), 0) as "totalAum"
      FROM months m
      ORDER BY m.month_start ASC
    `);

  interface HistoryRow {
    month: string;
    newClients: string | number;
    totalAum: string | number;
  }

  const history = (result.rows as unknown as HistoryRow[]).map((row) => ({
    month: row.month,
    newClients: Number(row.newClients),
    totalAum: Number(row.totalAum),
  }));

  return history;
});
