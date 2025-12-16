/**
 * Teams Member Management Handlers
 *
 * GET /teams/:id/members - List team members
 * GET /teams/:id/members/:memberId - Get single member
 * POST /teams/:id/members - Add member
 * DELETE /teams/:id/members/:userId - Remove member
 */
import type { Request, Response } from 'express';
import { db, teams, teamMembership, users } from '@cactus/db';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getUserTeams } from '../../../auth/authorization';
import { invalidateAccessScope } from '../../../auth/cache';
import { teamMetricsCacheUtil } from '../../../utils/performance/cache';
import { addMemberSchema } from '../schemas';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';

/**
 * GET /teams/members - Obtener todos los miembros de equipos (para admin/managers)
 * IMPORTANTE: Esta ruta debe definirse antes de /:id para evitar colisiones
 */
export const getAllTeamMembers = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Solo admin y managers pueden ver miembros de equipo
  if (userRole !== 'admin' && userRole !== 'manager') {
    throw new HttpError(403, 'Access denied. Only managers and admins can view team members.');
  }

  let query = db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: teamMembership.role,
      teamId: teamMembership.teamId,
      userId: teamMembership.userId,
    })
    .from(users)
    .innerJoin(teamMembership, eq(users.id, teamMembership.userId));

  // Si es manager, filtrar solo sus equipos
  if (userRole === 'manager') {
    const userTeams = await getUserTeams(userId, userRole);
    // Filtrar equipos donde es manager
    const managedTeamIds = userTeams.filter((t) => t.role === 'manager').map((t) => t.id);

    if (managedTeamIds.length === 0) {
      return [];
    }

    // Agregar filtro WHERE teamId IN (...)
    query = query.where(inArray(teamMembership.teamId, managedTeamIds));
  }

  const members = await query;
  return members;
});

/**
 * GET /teams/:id/members - Obtener miembros de un equipo
 */
export const getTeamMembers = createRouteHandler(async (req: Request) => {
  const { id } = req.params; // Already validated by middleware
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view team members.');
  }

  // Get members for this specific team by teamId
  const members = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: teamMembership.role,
      teamId: teamMembership.teamId,
      userId: teamMembership.userId,
    })
    .from(users)
    .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
    .where(eq(teamMembership.teamId, id));

  return members;
});

/**
 * GET /teams/:id/members/:memberId - Obtener miembro individual de un equipo
 */
export const getTeamMember = createRouteHandler(async (req: Request) => {
  const { id, memberId } = req.params; // Already validated by middleware
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Verify user is a manager of this team
  const userTeams = await getUserTeams(userId, userRole);
  const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

  if (!isManager && userRole !== 'admin') {
    throw new HttpError(403, 'Access denied. Only team managers can view team members.');
  }

  // Get specific member
  const [member] = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: teamMembership.role,
      teamId: teamMembership.teamId,
      userId: teamMembership.userId,
    })
    .from(users)
    .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
    .where(and(eq(teamMembership.teamId, id), eq(teamMembership.userId, memberId)))
    .limit(1);

  if (!member) {
    throw new HttpError(404, 'Member not found in this team');
  }

  return member;
});

/**
 * POST /teams/:id/members - Agregar miembro al equipo
 */
export const addTeamMember = createAsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { userId: memberUserId } = req.body as z.infer<typeof addMemberSchema>;

  // Check if user can manage this team
  if (userRole !== 'admin') {
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

    if (!isManager) {
      throw new HttpError(403, 'Access denied. Only team managers can add members.');
    }
  }

  // Check if user exists
  const [user] = await db().select().from(users).where(eq(users.id, memberUserId)).limit(1);

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  // Add member to team (default role member)
  await db()
    .insert(teamMembership)
    .values({
      teamId: id,
      userId: memberUserId,
      role: 'member',
    })
    .onConflictDoNothing();

  // AI_DECISION: Invalidate cache when team membership changes
  // Justificación: Access scope del manager cambia cuando se agrega miembro, caché debe invalidarse
  // Impacto: Asegura que cambios en team membership se reflejen inmediatamente
  const [team] = await db()
    .select({ managerUserId: teams.managerUserId })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);
  if (team?.managerUserId) {
    invalidateAccessScope(team.managerUserId, 'manager');
  }
  teamMetricsCacheUtil.clear(); // Invalidate team metrics cache

  req.log.info({ teamId: id, memberUserId }, 'member added to team');

  return res.status(201).json({
    success: true,
    data: { added: true },
    requestId: req.requestId,
  });
});

/**
 * DELETE /teams/:id/members/:userId - Remover miembro del equipo
 */
export const removeTeamMember = createRouteHandler(async (req: Request) => {
  const { id, userId: memberUserId } = req.params; // Already validated by middleware
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Check if user can manage this team
  if (userRole !== 'admin') {
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some((t) => t.id === id && t.role === 'manager');

    if (!isManager) {
      throw new HttpError(403, 'Access denied. Only team managers can remove members.');
    }
  }

  await db()
    .delete(teamMembership)
    .where(and(eq(teamMembership.teamId, id), eq(teamMembership.userId, memberUserId)));

  // AI_DECISION: Invalidate cache when team membership changes
  // Justificación: Access scope del manager cambia cuando se elimina miembro, caché debe invalidarse
  // Impacto: Asegura que cambios en team membership se reflejen inmediatamente
  const [team] = await db()
    .select({ managerUserId: teams.managerUserId })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);
  if (team?.managerUserId) {
    invalidateAccessScope(team.managerUserId, 'manager');
  }
  teamMetricsCacheUtil.clear(); // Invalidate team metrics cache

  req.log.info({ teamId: id, memberUserId }, 'member removed from team');

  return { removed: true };
});
