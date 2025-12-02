/**
 * Teams Member Management Handlers
 * 
 * GET /teams/:id/members - List team members
 * GET /teams/:id/members/:memberId - Get single member
 * POST /teams/:id/members - Add member
 * DELETE /teams/:id/members/:userId - Remove member
 */
import type { Request, Response, NextFunction } from 'express';
import { db, teams, teamMembership, users } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getUserTeams } from '../../../auth/authorization';
import { invalidateAccessScope } from '../../../auth/cache';
import { teamMetricsCacheUtil } from '../../../utils/cache';
import { validateUuidParam } from '../../../utils/common-schemas';
import { addMemberSchema } from '../schemas';

/**
 * GET /teams/:id/members - Obtener miembros de un equipo
 */
export async function getTeamMembers(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid team ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user is a manager of this team
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some(t => t.id === id && t.role === 'manager');

    if (!isManager && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only team managers can view team members.' });
    }

    // Get members for this specific team by teamId
    const members = await db()
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
      .where(eq(teamMembership.teamId, id));
    
    res.json({ success: true, data: members });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get team members');
    next(err);
  }
}

/**
 * GET /teams/:id/members/:memberId - Obtener miembro individual de un equipo
 */
export async function getTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    let memberId: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
      memberId = validateUuidParam(req.params.memberId, 'memberId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user is a manager of this team
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some(t => t.id === id && t.role === 'manager');

    if (!isManager && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only team managers can view team members.' });
    }

    // Get specific member
    const [member] = await db()
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
      .where(
        and(
          eq(teamMembership.teamId, id),
          eq(teamMembership.userId, memberId)
        )
      )
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this team' });
    }

    res.json({ success: true, data: member });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id, memberId: req.params.memberId }, 'failed to get team member');
    next(err);
  }
}

/**
 * POST /teams/:id/members - Agregar miembro al equipo
 */
export async function addTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid team ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { userId: memberUserId } = addMemberSchema.parse(req.body);

    // Check if user can manage this team
    if (userRole !== 'admin') {
      const userTeams = await getUserTeams(userId, userRole);
      const isManager = userTeams.some(t => t.id === id && t.role === 'manager');
      
      if (!isManager) {
        return res.status(403).json({ error: 'Access denied. Only team managers can add members.' });
      }
    }

    // Check if user exists
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.id, memberUserId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add member to team (default role member)
    await db()
      .insert(teamMembership)
      .values({
        teamId: id,
        userId: memberUserId,
        role: 'member'
      })
      .onConflictDoNothing();

    // AI_DECISION: Invalidate cache when team membership changes
    // Justificación: Access scope del manager cambia cuando se agrega miembro, caché debe invalidarse
    // Impacto: Asegura que cambios en team membership se reflejen inmediatamente
    const [team] = await db().select({ managerUserId: teams.managerUserId }).from(teams).where(eq(teams.id, id)).limit(1);
    if (team?.managerUserId) {
      invalidateAccessScope(team.managerUserId, 'manager');
    }
    teamMetricsCacheUtil.clear(); // Invalidate team metrics cache

    req.log.info({ teamId: id, memberUserId }, 'member added to team');
    res.status(201).json({ data: { added: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to add team member');
    next(err);
  }
}

/**
 * DELETE /teams/:id/members/:userId - Remover miembro del equipo
 */
export async function removeTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    let memberUserId: string;
    try {
      id = validateUuidParam(req.params.id, 'teamId');
      memberUserId = validateUuidParam(req.params.userId, 'userId');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user can manage this team
    if (userRole !== 'admin') {
      const userTeams = await getUserTeams(userId, userRole);
      const isManager = userTeams.some(t => t.id === id && t.role === 'manager');
      
      if (!isManager) {
        return res.status(403).json({ error: 'Access denied. Only team managers can remove members.' });
      }
    }

    await db()
      .delete(teamMembership)
      .where(and(
        eq(teamMembership.teamId, id),
        eq(teamMembership.userId, memberUserId)
      ));

    // AI_DECISION: Invalidate cache when team membership changes
    // Justificación: Access scope del manager cambia cuando se elimina miembro, caché debe invalidarse
    // Impacto: Asegura que cambios en team membership se reflejen inmediatamente
    const [team] = await db().select({ managerUserId: teams.managerUserId }).from(teams).where(eq(teams.id, id)).limit(1);
    if (team?.managerUserId) {
      invalidateAccessScope(team.managerUserId, 'manager');
    }
    teamMetricsCacheUtil.clear(); // Invalidate team metrics cache

    req.log.info({ teamId: id, memberUserId }, 'member removed from team');
    res.json({ success: true, data: { removed: true } });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to remove team member');
    next(err);
  }
}


