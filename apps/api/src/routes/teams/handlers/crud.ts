/**
 * Teams CRUD Handlers
 *
 * GET /teams/:id - Get single team
 * POST /teams - Create team
 * PUT /teams/:id - Update team
 * DELETE /teams/:id - Delete team
 */
import type { Request, Response } from 'express';
import { db, teams, teamMembership } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { invalidateAccessScope } from '../../../auth/cache';
import { teamMetricsCacheUtil } from '../../../utils/performance/cache';
import { createTeamSchema, updateTeamSchema } from '../schemas';
import {
  checkTeamAccess,
  requireTeamManageAccessOrThrow,
  getTeamMembers as getMembers,
} from './utils';

/**
 * GET /teams/:id - Obtener equipo individual con sus miembros
 */
export const getTeam = createRouteHandler(async (req: Request) => {
  const teamId = req.params.id;

  const userId = req.user!.id;
  const userRole = req.user!.role;

  const access = await checkTeamAccess(userId, userRole, teamId);
  if (!access.hasAccess) {
    throw new HttpError(403, 'Access denied. You do not have access to this team.');
  }

  const [team] = await db().select().from(teams).where(eq(teams.id, teamId)).limit(1);

  if (!team) {
    throw new HttpError(404, 'Team not found');
  }

  // Get team members only if user has manager access
  const canViewMembers =
    access.isManager || access.userTeams.some((t) => t.id === teamId && t.role === 'manager');
  const teamMembers = canViewMembers ? await getMembers(teamId) : [];

  return { ...team, members: teamMembers };
});

/**
 * POST /teams - Crear nuevo equipo (managers y admin)
 */
export const createTeam = createAsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== 'manager' && userRole !== 'admin') {
    throw new HttpError(403, 'Only managers and administrators can create teams');
  }

  const validated = req.body as z.infer<typeof createTeamSchema>;
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

  return res.status(201).json({
    success: true,
    data: newTeam,
    requestId: req.requestId,
  });
});

/**
 * PUT /teams/:id - Actualizar equipo (solo admin o manager del equipo)
 */
export const updateTeam = createRouteHandler(async (req: Request) => {
  const teamId = req.params.id;

  const userId = req.user!.id;
  const userRole = req.user!.role;

  await requireTeamManageAccessOrThrow(userId, userRole, teamId, 'update');

  const validated = req.body as z.infer<typeof updateTeamSchema>;

  const [updated] = await db()
    .update(teams)
    .set({ ...validated, updatedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning();

  if (!updated) {
    throw new HttpError(404, 'Team not found');
  }

  teamMetricsCacheUtil.clear();

  req.log.info({ teamId }, 'team updated');

  return updated;
});

/**
 * DELETE /teams/:id - Eliminar equipo (solo admin o manager del equipo)
 */
export const deleteTeam = createRouteHandler(async (req: Request) => {
  const teamId = req.params.id;

  const userId = req.user!.id;
  const userRole = req.user!.role;

  await requireTeamManageAccessOrThrow(userId, userRole, teamId, 'delete');

  await db().delete(teamMembership).where(eq(teamMembership.teamId, teamId));

  const [deleted] = await db().delete(teams).where(eq(teams.id, teamId)).returning();

  if (!deleted) {
    throw new HttpError(404, 'Team not found');
  }

  req.log.info({ teamId }, 'team deleted');
  return { deleted: true };
});
