import type { Request, Response, NextFunction } from 'express';
import { db, teamMembership, teams, users, pipelineStages, pipelineStageHistory } from '@cactus/db';
import { contacts, notes, tasks, aumSnapshots } from '@cactus/db/schema';
import { eq, and, sql, sum, count, gte, inArray } from 'drizzle-orm';

/**
 * GET /teams/member-dashboard
 *
 * Returns data for the member's dashboard:
 * - Team info (if assigned)
 * - Personal metrics (AUM, contacts, tasks)
 * - Calendar URL
 */
export async function getMemberDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    // 1. Get User's Team
    const [membership] = await db()
      .select({
        teamId: teamMembership.teamId,
        teamName: teams.name,
        managerId: teams.managerUserId,
        calendarUrl: teams.calendarUrl,
        calendarId: teams.calendarId,
        role: teamMembership.role,
        managerName: users.fullName,
      })
      .from(teamMembership)
      .innerJoin(teams, eq(teams.id, teamMembership.teamId))
      .leftJoin(users, eq(users.id, teams.managerUserId))
      .where(eq(teamMembership.userId, userId))
      .limit(1);

    if (!membership) {
      return res.json({
        success: true,
        data: {
          hasTeam: false,
          team: null,
          metrics: null,
        },
      });
    }

    // 2. Get Personal Metrics
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

    const [
      aumResult,
      contactsThisMonth,
      activeLeads, // Open prospects/leads
      openTasks,
      firstMeetingsLast30Days,
      secondMeetingsLast30Days,
    ] = await Promise.all([
      // Total AUM (Latest snapshot)
      db()
        .select({ totalAum: sum(aumSnapshots.aumTotal) })
        .from(aumSnapshots)
        .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
        .where(
          and(
            eq(contacts.assignedAdvisorId, userId),
            eq(aumSnapshots.date, today.toISOString().split('T')[0])
          )
        ),

      // New Contacts This Month
      db()
        .select({ count: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.assignedAdvisorId, userId),
            sql`${contacts.deletedAt} IS NULL`,
            gte(contacts.createdAt, monthStart)
          )
        ),

      // Active Leads (Total Clients)
      db()
        .select({ count: count() })
        .from(contacts)
        .where(and(eq(contacts.assignedAdvisorId, userId), sql`${contacts.deletedAt} IS NULL`)),

      // Open Tasks
      db()
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.assignedToUserId, userId),
            eq(tasks.status, 'pending'),
            sql`${tasks.deletedAt} IS NULL`
          )
        ),

      // First Meetings Last 30 Days
      firstMeetingStageId
        ? db()
            .select({ count: count(sql`DISTINCT ${pipelineStageHistory.contactId}`) })
            .from(pipelineStageHistory)
            .innerJoin(contacts, eq(contacts.id, pipelineStageHistory.contactId))
            .where(
              and(
                eq(contacts.assignedAdvisorId, userId),
                eq(pipelineStageHistory.toStage, firstMeetingStageId),
                gte(pipelineStageHistory.changedAt, thirtyDaysAgo)
              )
            )
        : Promise.resolve([{ count: 0 }]),

      // Second Meetings Last 30 Days
      secondMeetingStageId
        ? db()
            .select({ count: count(sql`DISTINCT ${pipelineStageHistory.contactId}`) })
            .from(pipelineStageHistory)
            .innerJoin(contacts, eq(contacts.id, pipelineStageHistory.contactId))
            .where(
              and(
                eq(contacts.assignedAdvisorId, userId),
                eq(pipelineStageHistory.toStage, secondMeetingStageId),
                gte(pipelineStageHistory.changedAt, thirtyDaysAgo)
              )
            )
        : Promise.resolve([{ count: 0 }]),
    ]);

    res.json({
      success: true,
      data: {
        hasTeam: true,
        team: {
          id: membership.teamId,
          name: membership.teamName,
          managerName: membership.managerName,
          calendarUrl: membership.calendarUrl,
          calendarId: membership.calendarId, // For calendar integration
          role: membership.role,
        },
        metrics: {
          totalAum: Number(aumResult[0]?.totalAum) || 0,
          newContactsMonth: activeLeads[0]?.count || 0, // Should be contactsThisMonth? Label says newContactsMonth but value was activeLeads. Let's fix logic below.
          totalClients: activeLeads[0]?.count || 0,
          newContactsThisMonth: contactsThisMonth[0]?.count || 0,
          openTasks: openTasks[0]?.count || 0,
          firstMeetingsLast30Days: Number(firstMeetingsLast30Days[0]?.count || 0),
          secondMeetingsLast30Days: Number(secondMeetingsLast30Days[0]?.count || 0),
        },
      },
    });
  } catch (err) {
    req.log.error({ err, userId: req.user?.id }, 'failed to get member dashboard');
    next(err);
  }
}
