import type { Request, Response, NextFunction } from 'express';
import { db, teamMembership } from '@cactus/db';
import { contacts } from '@cactus/db/schema';
import { eq, and, sql, lt, isNull, inArray } from 'drizzle-orm';
import { validateUuidParam } from '../../../utils/validation/common-schemas';
import { getUserTeams } from '../../../auth/authorization';

/**
 * GET /teams/:id/leads/unassigned
 * List leads that are unassigned or "stalled" (no activity > 30 days)
 */
export async function getUnassignedOrStalledLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = validateUuidParam(req.params.id, 'teamId');
    const { type } = req.query; // 'unassigned' | 'stalled'

    // Access check
    const userTeams = await getUserTeams(req.user!.id, req.user!.role);
    const isManager =
      req.user!.role === 'admin' || userTeams.some((t) => t.id === teamId && t.role === 'manager');

    if (!isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (type === 'unassigned') {
      // Logic for unassigned leads in team pool
      // Assuming contacts can be assigned to a team but have assigned_advisor_id = NULL
      const results = await db()
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.assignedTeamId, teamId),
            isNull(contacts.assignedAdvisorId),
            isNull(contacts.deletedAt)
          )
        );
      return res.json({ success: true, data: results });
    } else {
      // Stalled leads: assigned to team members but no touch in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get team members
      const members = await db()
        .select({ id: teamMembership.userId })
        .from(teamMembership)
        .where(eq(teamMembership.teamId, teamId));

      const memberIds = members.map((m: { id: string }) => m.id);

      if (memberIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const results = await db()
        .select()
        .from(contacts)
        .where(
          and(
            inArray(contacts.assignedAdvisorId, memberIds),
            lt(contacts.contactLastTouchAt, thirtyDaysAgo),
            isNull(contacts.deletedAt)
          )
        )
        .limit(100); // Limit for performance

      return res.json({ success: true, data: results });
    }
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get leads');
    next(err);
  }
}

/**
 * POST /teams/:id/leads/reassign
 * Bulk reassign leads
 */
export async function reassignLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = validateUuidParam(req.params.id, 'teamId');
    const { contactIds, newAdvisorId } = req.body;

    if (!Array.isArray(contactIds) || !newAdvisorId) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Access check
    const userTeams = await getUserTeams(req.user!.id, req.user!.role);
    const isManager =
      req.user!.role === 'admin' || userTeams.some((t) => t.id === teamId && t.role === 'manager');

    if (!isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify new advisor is in team
    const [member] = await db()
      .select()
      .from(teamMembership)
      .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, newAdvisorId)));

    if (!member) {
      return res.status(400).json({ error: 'New advisor is not in the team' });
    }

    // Execute update
    await db()
      .update(contacts)
      .set({
        assignedAdvisorId: newAdvisorId,
        updatedAt: new Date(),
        // Maybe log activity/history here? For MVP direct update.
      })
      .where(inArray(contacts.id, contactIds));

    res.json({ success: true, count: contactIds.length });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to reassign leads');
    next(err);
  }
}
