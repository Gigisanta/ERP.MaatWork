/**
 * Teams List Handlers
 *
 * GET /teams - List all teams
 * GET /teams/my-teams - Get current user's teams
 */
import type { Request, Response, NextFunction } from 'express';
import { db, teams, teamMembership, users } from '@cactus/db';
import { eq, inArray, type InferSelectModel } from 'drizzle-orm';
import { getUserTeams, getTeamMembers } from '../../../auth/authorization';

type Team = InferSelectModel<typeof teams>;

/**
 * GET /teams - Listar equipos
 */
export async function listTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user's teams
    const userTeams = await getUserTeams(userId, userRole);

    if (!userTeams || userTeams.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // AI_DECISION: Optimizar N+1 pattern - batch query en lugar de queries individuales por equipo
    // Justificación: Reduce de N queries a 2 queries (teams + members), mejora significativa en performance
    // Impacto: Mejora latencia del endpoint GET /teams cuando hay múltiples equipos
    const teamIds = userTeams.map((t) => t.id);

    // Batch query: obtener todos los detalles de equipos de una vez
    const allTeamDetails = await db().select().from(teams).where(inArray(teams.id, teamIds));

    // Crear Map para acceso rápido por ID
    const teamDetailsMap = new Map(allTeamDetails.map((t: Team) => [t.id, t]));

    // Batch query: obtener todos los miembros de todos los equipos de una vez
    // Solo si el usuario es manager o admin (tienen permisos para ver miembros)
    const canViewMembers = userTeams.some((t) => t.role === 'manager') || userRole === 'admin';
    const allMembers = canViewMembers
      ? await db()
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            role: teamMembership.role,
            teamId: teamMembership.teamId,
          })
          .from(users)
          .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
          .where(inArray(teamMembership.teamId, teamIds))
      : [];

    // Agrupar miembros por teamId
    const membersByTeamId = new Map<
      string,
      Array<{ id: string; email: string; fullName: string; role: string }>
    >();
    for (const member of allMembers) {
      if (member.teamId) {
        const existing = membersByTeamId.get(member.teamId) || [];
        existing.push({
          id: member.id,
          email: member.email,
          fullName: member.fullName,
          role: member.role,
        });
        membersByTeamId.set(member.teamId, existing);
      }
    }

    // Combinar datos en memoria
    const teamsWithDetails = userTeams.map((team) => {
      const teamDetails = teamDetailsMap.get(team.id);
      const members =
        teamDetails && (team.role === 'manager' || userRole === 'admin')
          ? membersByTeamId.get(team.id) || []
          : [];

      return {
        ...team,
        ...(teamDetails || {}),
        members,
      };
    });

    res.json({ success: true, data: teamsWithDetails });
  } catch (err) {
    req.log.error({ err }, 'failed to list teams');
    next(err);
  }
}

/**
 * GET /teams/my-teams - Obtener equipos del usuario actual
 */
export async function getMyTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user's teams with member details
    const userTeams = await getUserTeams(userId, userRole);

    // AI_DECISION: Optimizar N+1 pattern - batch query en lugar de queries individuales por equipo
    // Justificación: Reduce de N queries a 1 query, mejora significativa en performance
    // Impacto: Mejora latencia del endpoint GET /teams/my-teams cuando hay múltiples equipos
    const teamIds = userTeams.map((t) => t.id);

    // Batch query: obtener todos los detalles de equipos de una vez
    const allTeamDetails = await db().select().from(teams).where(inArray(teams.id, teamIds));

    // Crear Map para acceso rápido por ID
    const teamDetailsMap = new Map(allTeamDetails.map((t: Team) => [t.id, t]));

    // Obtener miembros solo si el usuario es manager (una sola query)
    const members = userTeams.some((t) => t.role === 'manager') ? await getTeamMembers(userId) : [];

    // Combinar datos en memoria
    const teamsWithDetails = userTeams.map((team) => {
      const teamDetails = teamDetailsMap.get(team.id);
      return {
        ...team,
        ...(teamDetails || {}),
        members: team.role === 'manager' ? members : [],
      };
    });

    res.json({ success: true, data: teamsWithDetails });
  } catch (err) {
    req.log.error({ err }, 'failed to get user teams');
    next(err);
  }
}
