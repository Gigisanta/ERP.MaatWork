import type { Request, Response, NextFunction } from 'express';
import { db, teamMembership, users } from '@cactus/db';
import { contacts, tasks } from '@cactus/db/schema';
import { eq, and, sql, count, isNull, inArray } from 'drizzle-orm';
import { validateUuidParam } from '../../../utils/validation/common-schemas';
import { getUserTeams } from '../../../auth/authorization';

/**
 * GET /teams/:id/capacity
 * Get capacity metrics for all team members
 */
export async function getTeamCapacity(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = validateUuidParam(req.params.id, 'teamId');

    // Access check
    const userTeams = await getUserTeams(req.user!.id, req.user!.role);
    const isManager =
      req.user!.role === 'admin' || userTeams.some((t) => t.id === teamId && t.role === 'manager');

    if (!isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const monthStart = new Date();
    monthStart.setDate(1); // First day of current month

    // Get members
    const members = await db()
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isActive: users.isActive,
      })
      .from(teamMembership)
      .innerJoin(users, eq(users.id, teamMembership.userId))
      .where(eq(teamMembership.teamId, teamId));

    if (members.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const memberIds = members.map((m: { id: string }) => m.id);

    // Aggregate metrics per member
    // 1. Active Clients (Total assigned)
    // 2. Open Tasks (Pending tasks)
    // 3. New Leads (This month)

    const [activeClientsRes, openTasksRes, newLeadsRes] = await Promise.all([
      db().execute(sql`
        SELECT assigned_advisor_id as "userId", COUNT(*) as count
        FROM contacts
        WHERE assigned_advisor_id IN ${memberIds}
          AND deleted_at IS NULL
        GROUP BY assigned_advisor_id
      `),
      db().execute(sql`
        SELECT assigned_to_user_id as "userId", COUNT(*) as count
        FROM tasks
        WHERE assigned_to_user_id IN ${memberIds}
          AND status = 'pending'
          AND deleted_at IS NULL
        GROUP BY assigned_to_user_id
      `),
      db().execute(sql`
        SELECT assigned_advisor_id as "userId", COUNT(*) as count
        FROM contacts
        WHERE assigned_advisor_id IN ${memberIds}
          AND created_at >= ${monthStart.toISOString()}::timestamp
          AND deleted_at IS NULL
        GROUP BY assigned_advisor_id
      `),
    ]);

    // Map results to members
    const capacityData = members.map((member: { id: string; fullName: string | null }) => {
      const activeClients = Number(
        activeClientsRes.rows.find((r: any) => r.userId === member.id)?.count || 0
      );
      const openTasks = Number(
        openTasksRes.rows.find((r: any) => r.userId === member.id)?.count || 0
      );
      const newLeads = Number(
        newLeadsRes.rows.find((r: any) => r.userId === member.id)?.count || 0
      );

      // Simple heuristic for capacity score (0-100)
      // Assumptions:
      // - Max comfortable clients: 150
      // - Max comfortable open tasks: 20
      // - Weight: Clients (60%), Tasks (40%)
      const clientLoad = Math.min(activeClients / 150, 1);
      const taskLoad = Math.min(openTasks / 20, 1);
      const score = Math.round((clientLoad * 0.6 + taskLoad * 0.4) * 100);

      let status = 'optimal';
      if (score < 30) status = 'low';
      if (score > 80) status = 'overloaded';

      return {
        id: member.id,
        name: member.fullName,
        metrics: {
          activeClients,
          openTasks,
          newLeads,
        },
        score,
        status,
      };
    });

    res.json({ success: true, data: capacityData });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get capacity');
    next(err);
  }
}
