/**
 * Teams CRUD Handlers
 *
 * GET /teams/:id - Get single team
 * POST /teams - Create team
 * PUT /teams/:id - Update team
 * DELETE /teams/:id - Delete team
 */
import type { Request, Response, NextFunction } from 'express';
import { db, teams, teamMembership } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { invalidateAccessScope } from '../../../auth/cache';
import { teamMetricsCacheUtil } from '../../../utils/cache';
import { createTeamSchema, updateTeamSchema } from '../schemas';
import {
  parseTeamId,
  checkTeamAccess,
  requireTeamManageAccess,
  getTeamMembers,
  handleZodError,
} from './utils';

/**
 * GET /teams/:id - Obtener equipo individual con sus miembros
 */
export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseTeamId(req.params.id, res);
    if (!teamId) return;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const access = await checkTeamAccess(userId, userRole, teamId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this team.' });
    }

    const [team] = await db().select().from(teams).where(eq(teams.id, teamId)).limit(1);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team members only if user has manager access
    const canViewMembers =
      access.isManager || access.userTeams.some((t) => t.id === teamId && t.role === 'manager');
    const teamMembers = canViewMembers ? await getTeamMembers(teamId) : [];

    res.json({
      success: true,
      data: { ...team, members: teamMembers },
    });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get team');
    next(err);
  }
}

/**
 * POST /teams - Crear nuevo equipo (managers y admin)
 */
export async function createTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only managers and administrators can create teams' });
    }

    const validated = createTeamSchema.parse(req.body);
    const managerUserId = userRole === 'manager' ? userId : validated.managerUserId || userId;

    const [newTeam] = await db()
      .insert(teams)
      .values({ ...validated, managerUserId })
      .returning();

    await db()
      .insert(teamMembership)
      .values({ teamId: newTeam.id, userId: managerUserId, role: 'lead' })
      .onConflictDoNothing();

    // AI_DECISION: Invalidate cache when team membership changes
    // Justificación: Access scope cambia cuando se modifica team membership
    invalidateAccessScope(managerUserId, 'manager');
    teamMetricsCacheUtil.clear();

    req.log.info({ teamId: newTeam.id }, 'team created');
    res.status(201).json({ success: true, data: newTeam });
  } catch (err) {
    if (handleZodError(err, res)) return;
    req.log.error({ err }, 'failed to create team');
    next(err);
  }
}

/**
 * PUT /teams/:id - Actualizar equipo (solo admin o manager del equipo)
 */
export async function updateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseTeamId(req.params.id, res);
    if (!teamId) return;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const hasAccess = await requireTeamManageAccess(userId, userRole, teamId, res, 'update');
    if (!hasAccess) return;

    const validated = updateTeamSchema.parse(req.body);

    const [updated] = await db()
      .update(teams)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }

    teamMetricsCacheUtil.clear();

    req.log.info({ teamId }, 'team updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    if (handleZodError(err, res)) return;
    req.log.error({ err, teamId: req.params.id }, 'failed to update team');
    next(err);
  }
}

/**
 * DELETE /teams/:id - Eliminar equipo (solo admin o manager del equipo)
 */
export async function deleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseTeamId(req.params.id, res);
    if (!teamId) return;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const hasAccess = await requireTeamManageAccess(userId, userRole, teamId, res, 'delete');
    if (!hasAccess) return;

    await db().delete(teamMembership).where(eq(teamMembership.teamId, teamId));

    const [deleted] = await db().delete(teams).where(eq(teams.id, teamId)).returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }

    req.log.info({ teamId }, 'team deleted');
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to delete team');
    next(err);
  }
}
