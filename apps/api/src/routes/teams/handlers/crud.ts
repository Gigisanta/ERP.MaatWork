/**
 * Teams CRUD Handlers
 * 
 * GET /teams/:id - Get single team
 * POST /teams - Create team
 * PUT /teams/:id - Update team
 * DELETE /teams/:id - Delete team
 */
import type { Request, Response, NextFunction } from 'express';
import { db, teams, teamMembership, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getUserTeams } from '../../../auth/authorization';
import { invalidateAccessScope } from '../../../auth/cache';
import { teamMetricsCacheUtil } from '../../../utils/cache';
import { validateUuidParam } from '../../../utils/common-schemas';
import { createTeamSchema, updateTeamSchema } from '../schemas';

/**
 * GET /teams/:id - Obtener equipo individual con sus miembros
 */
export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid team ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user has access to this team
    const userTeams = await getUserTeams(userId, userRole);
    const hasAccess = userTeams.some(t => t.id === id) || userRole === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this team.' });
    }

    // Get team details
    const [team] = await db()
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team members (only if user is manager or admin)
    const canViewMembers = userTeams.some(t => t.id === id && t.role === 'manager') || userRole === 'admin';
    const teamMembers = canViewMembers ? await db()
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: teamMembership.role,
        teamId: teamMembership.teamId,
        userId: teamMembership.userId
      })
      .from(users)
      .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
      .where(eq(teamMembership.teamId, id)) : [];

    res.json({ 
      success: true, 
      data: {
        ...team,
        members: teamMembers
      }
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

    // Solo managers y admins pueden crear equipos
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only managers and administrators can create teams' });
    }

    const validated = createTeamSchema.parse(req.body);

    // Los managers solo pueden crear equipos para sí mismos
    const managerUserId = userRole === 'manager' ? userId : (validated.managerUserId || userId);

    const [newTeam] = await db()
      .insert(teams)
      .values({
        ...validated,
        managerUserId: managerUserId
      })
      .returning();

    // Ensure manager is part of the team as lead/manager
    await db()
      .insert(teamMembership)
      .values({
        teamId: newTeam.id,
        userId: managerUserId,
        role: 'lead'
      })
      .onConflictDoNothing();

    // AI_DECISION: Invalidate cache when team membership changes
    // Justificación: Access scope cambia cuando se modifica team membership, caché debe invalidarse
    // Impacto: Asegura que cambios en team membership se reflejen inmediatamente
    invalidateAccessScope(managerUserId, 'manager');
    teamMetricsCacheUtil.clear(); // Invalidate team metrics cache

    req.log.info({ teamId: newTeam.id }, 'team created');
    res.status(201).json({ success: true, data: newTeam });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create team');
    next(err);
  }
}

/**
 * PUT /teams/:id - Actualizar equipo (solo admin o manager del equipo)
 */
export async function updateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid team ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = updateTeamSchema.parse(req.body);

    // Check if user can manage this team
    if (userRole !== 'admin') {
      const userTeams = await getUserTeams(userId, userRole);
      const isManager = userTeams.some(t => t.id === id && t.role === 'manager');
      
      if (!isManager) {
        return res.status(403).json({ error: 'Access denied. Only team managers can update this team.' });
      }
    }

    const [updated] = await db()
      .update(teams)
      .set({
        ...validated,
        updatedAt: new Date()
      })
      .where(eq(teams.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Invalidate team metrics cache when team is updated
    teamMetricsCacheUtil.clear();

    req.log.info({ teamId: id }, 'team updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to update team');
    next(err);
  }
}

/**
 * DELETE /teams/:id - Eliminar equipo (solo admin o manager del equipo)
 */
export async function deleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid team ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user can manage this team
    if (userRole !== 'admin') {
      const userTeams = await getUserTeams(userId, userRole);
      const isManager = userTeams.some(t => t.id === id && t.role === 'manager');
      
      if (!isManager) {
        return res.status(403).json({ error: 'Access denied. Only team managers can delete this team.' });
      }
    }

    // Delete team memberships first
    await db()
      .delete(teamMembership)
      .where(eq(teamMembership.teamId, id));

    // Delete the team
    const [deleted] = await db()
      .delete(teams)
      .where(eq(teams.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }

    req.log.info({ teamId: id }, 'team deleted');
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to delete team');
    next(err);
  }
}


