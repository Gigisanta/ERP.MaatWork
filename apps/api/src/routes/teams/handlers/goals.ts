import type { Request, Response, NextFunction } from 'express';
import { db, teamGoals, teamMembership } from '@cactus/db';
import { teams } from '@cactus/db/schema';
import { eq, and, sql, sum, gte, lte } from 'drizzle-orm';
import { validateUuidParam } from '../../../utils/validation/common-schemas';
import { getUserTeams } from '../../../auth/authorization';

/**
 * GET /teams/:id/goals
 * Retrieve team goals and current progress for a specific month/year.
 */
export async function getTeamGoals(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = validateUuidParam(req.params.id, 'teamId');
    const { month, year } = req.query;

    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
    const targetYear = year ? Number(year) : new Date().getFullYear();

    // Verify access
    const userTeams = await getUserTeams(req.user!.id, req.user!.role);
    const hasAccess =
      req.user!.role === 'admin' ||
      userTeams.some((t) => t.id === teamId && ['manager', 'member'].includes(t.role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 1. Get defined goals
    const goals = await db()
      .select()
      .from(teamGoals)
      .where(
        and(
          eq(teamGoals.teamId, teamId),
          eq(teamGoals.month, targetMonth),
          eq(teamGoals.year, targetYear)
        )
      );

    // 2. Calculate actuals (Live aggregation)
    // Define date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // We can use the 'mv_team_metrics_daily' if available, or aggregation queries similar to metrics.ts
    // For simplicity and real-time accuracy, we'll run a few aggregations.

    // Get team members to filter queries
    const members = await db()
      .select({ id: teamMembership.userId })
      .from(teamMembership)
      .where(eq(teamMembership.teamId, teamId));

    const memberIds = members.map((m: { id: string }) => m.id);

    if (memberIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Parallel aggregations
    // new_prospects (contacts created in month)
    // tasks_completed (tasks completed in month)
    // total_aum (latest snapshot sum)

    const [newProspectsRes, tasksCompletedRes, totalAumRes] = await Promise.all([
      // New Prospects
      db().execute(sql`
        SELECT COUNT(*) as count
        FROM contacts
        WHERE assigned_advisor_id IN ${memberIds}
          AND created_at >= ${startDateStr}::timestamp
          AND created_at <= ${endDateStr}::timestamp
          AND deleted_at IS NULL
      `),
      // Tasks Completed
      db().execute(sql`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE assigned_to_user_id IN ${memberIds}
          AND status = 'completed'
          AND completed_at >= ${startDateStr}::timestamp
          AND completed_at <= ${endDateStr}::timestamp
          AND deleted_at IS NULL
      `),
      // Total AUM (Current)
      db().execute(sql`
        SELECT COALESCE(SUM(aum.aum_total), 0) as total
        FROM aum_snapshots aum
        JOIN contacts c ON c.id = aum.contact_id
        WHERE c.assigned_advisor_id IN ${memberIds}
          AND aum.date = CURRENT_DATE
      `),
    ]);

    const actuals = {
      new_prospects: Number(newProspectsRes.rows[0].count),
      tasks_completed: Number(tasksCompletedRes.rows[0].count),
      total_aum: Number(totalAumRes.rows[0].total),
      // Add more metrics as needed
    };

    // Merge goals with actuals
    // Default goal types if not set
    const defaultTypes = ['new_prospects', 'tasks_completed', 'total_aum'];

    const result = defaultTypes.map((type) => {
      const definedGoal = goals.find((g: typeof teamGoals.$inferSelect) => g.type === type);
      return {
        type,
        target: definedGoal ? Number(definedGoal.targetValue) : 0,
        actual: actuals[type as keyof typeof actuals] || 0,
        month: targetMonth,
        year: targetYear,
      };
    });

    // Add any other custom defined goals
    goals.forEach((g: typeof teamGoals.$inferSelect) => {
      if (!defaultTypes.includes(g.type)) {
        result.push({
          type: g.type,
          target: Number(g.targetValue),
          actual: 0, // We don't have logic for custom types yet
          month: targetMonth,
          year: targetYear,
        });
      }
    });

    res.json({ success: true, data: result });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get team goals');
    next(err);
  }
}

/**
 * POST /teams/:id/goals
 * Set or update a team goal
 */
export async function updateTeamGoal(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = validateUuidParam(req.params.id, 'teamId');
    const { month, year, type, target } = req.body;

    // Validation
    if (!month || !year || !type || target === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify manager access
    const userTeams = await getUserTeams(req.user!.id, req.user!.role);
    const isManager =
      req.user!.role === 'admin' || userTeams.some((t) => t.id === teamId && t.role === 'manager');

    if (!isManager) {
      return res.status(403).json({ error: 'Only managers can update goals' });
    }

    // Upsert goal
    await db()
      .insert(teamGoals)
      .values({
        teamId,
        month,
        year,
        type,
        targetValue: String(target),
      })
      .onConflictDoUpdate({
        target: [teamGoals.teamId, teamGoals.month, teamGoals.year, teamGoals.type],
        set: {
          targetValue: String(target),
          updatedAt: new Date(),
        },
      });

    res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to update team goal');
    next(err);
  }
}
