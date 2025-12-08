/**
 * Teams Invitations Handlers
 *
 * GET /teams/invitations/pending - List pending invitations for user
 * POST /teams/invitations/:id/accept - Accept invitation
 * POST /teams/invitations/:id/reject - Reject invitation
 * POST /teams/:id/invitations - Create invitation (manager)
 * GET /teams/:id/advisors - List eligible advisors
 */
import type { Request, Response } from 'express';
import { db, teams, teamMembership, users, teamMembershipRequests } from '@cactus/db';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getUserTeams } from '../../../auth/authorization';
import { validateUuidParam } from '../../../utils/common-schemas';
import type { PendingInvite } from '../../../types/teams';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';

/**
 * GET /teams/invitations/pending - Pending invitations for current user
 */
export const listPendingInvitations = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  // List pending requests where current user is the invitee
  const dbi = db();
  // Get manager teams to include team info
  const rows = await dbi
    .select({
      id: teamMembershipRequests.id,
      managerId: teamMembershipRequests.managerId,
      status: teamMembershipRequests.status,
      createdAt: teamMembershipRequests.createdAt,
      managerEmail: users.email,
      managerFullName: users.fullName,
    })
    .from(teamMembershipRequests)
    .innerJoin(users, eq(teamMembershipRequests.managerId, users.id))
    .where(
      and(
        eq(teamMembershipRequests.userId, userId),
        inArray(teamMembershipRequests.status, ['pending', 'invited'])
      )
    );

  return rows;
});

/**
 * POST /teams/invitations/:id/accept - Invitee accepts invitation
 */
export const acceptInvitation = createRouteHandler(async (req: Request) => {
  let id: string;
  try {
    id = validateUuidParam(req.params.id, 'invitationId');
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Invalid invitation ID format');
  }
  const userId = req.user!.id;

  // AI_DECISION: Usar JOIN para obtener request y managerTeam en una sola query en lugar de 2 queries separadas.
  // Esto reduce latencia al combinar ambas búsquedas en una sola operación de DB.
  const requestWithTeam = await db()
    .select({
      requestId: teamMembershipRequests.id,
      userId: teamMembershipRequests.userId,
      managerId: teamMembershipRequests.managerId,
      status: teamMembershipRequests.status,
      createdAt: teamMembershipRequests.createdAt,
      resolvedAt: teamMembershipRequests.resolvedAt,
      resolvedByUserId: teamMembershipRequests.resolvedByUserId,
      teamId: teams.id,
      teamName: teams.name,
      teamDescription: teams.description,
      teamManagerUserId: teams.managerUserId,
      teamCalendarUrl: teams.calendarUrl,
      teamCreatedAt: teams.createdAt,
      teamUpdatedAt: teams.updatedAt,
    })
    .from(teamMembershipRequests)
    .leftJoin(teams, eq(teams.managerUserId, teamMembershipRequests.managerId))
    .where(eq(teamMembershipRequests.id, id))
    .limit(1);

  if (requestWithTeam.length === 0) {
    throw new HttpError(404, 'Invitation not found');
  }

  const row = requestWithTeam[0];
  const request = {
    id: row.requestId,
    userId: row.userId,
    managerId: row.managerId,
    status: row.status,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedByUserId: row.resolvedByUserId,
  };

  if (request.status !== 'pending' && request.status !== 'invited') {
    throw new HttpError(400, 'Invitation not pending');
  }
  if (request.userId !== userId) {
    throw new HttpError(403, 'Not your invitation');
  }

  // Extract manager team from joined result
  const managerTeam = row.teamId
    ? {
        id: row.teamId,
        name: row.teamName,
        description: row.teamDescription,
        managerUserId: row.teamManagerUserId,
        calendarUrl: row.teamCalendarUrl,
        createdAt: row.teamCreatedAt,
        updatedAt: row.teamUpdatedAt,
      }
    : null;
  if (!managerTeam) {
    throw new HttpError(400, 'Manager has no team');
  }

  await db()
    .insert(teamMembership)
    .values({ teamId: managerTeam.id, userId, role: 'member' })
    .onConflictDoNothing();
  await db()
    .update(teamMembershipRequests)
    .set({ status: 'approved', resolvedAt: new Date(), resolvedByUserId: userId })
    .where(eq(teamMembershipRequests.id, id));

  req.log.info({ requestId: id, userId, teamId: managerTeam.id }, 'invitation accepted');
  return { accepted: true };
});

/**
 * POST /teams/invitations/:id/reject - Invitee rejects invitation
 */
export const rejectInvitation = createRouteHandler(async (req: Request) => {
  let id: string;
  try {
    id = validateUuidParam(req.params.id, 'invitationId');
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Invalid invitation ID format');
  }
  const userId = req.user!.id;

  const [request] = await db()
    .select()
    .from(teamMembershipRequests)
    .where(eq(teamMembershipRequests.id, id))
    .limit(1);
  if (!request) {
    throw new HttpError(404, 'Invitation not found');
  }
  if (request.status !== 'pending' && request.status !== 'invited') {
    throw new HttpError(400, 'Invitation not pending');
  }
  if (request.userId !== userId) {
    throw new HttpError(403, 'Not your invitation');
  }

  await db()
    .update(teamMembershipRequests)
    .set({ status: 'rejected', resolvedAt: new Date(), resolvedByUserId: userId })
    .where(eq(teamMembershipRequests.id, id));

  req.log.info({ requestId: id, userId }, 'invitation rejected');
  return { rejected: true };
});

/**
 * POST /teams/:id/invitations - Manager/Admin invites an advisor to join the team
 */
export const createInvitation = createAsyncHandler(async (req: Request, res: Response) => {
  let id: string;
  try {
    id = validateUuidParam(req.params.id, 'teamId');
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Invalid team ID format');
  }
  const currentUserId = req.user!.id;
  const currentRole = req.user!.role;

  const { userId } = req.body as { userId: string };

  // Only admin or manager of this team can invite
  if (currentRole !== 'admin') {
    const myTeams = await getUserTeams(currentUserId, currentRole);
    const isManager = myTeams.some((t) => t.id === id && t.role === 'manager');
    if (!isManager) {
      throw new HttpError(403, 'Access denied. Only team managers can invite users.');
    }
  }

  // Find team and its manager
  const dbi = db();
  const [teamRow] = await dbi.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!teamRow) {
    throw new HttpError(404, 'Team not found');
  }
  let managerId = teamRow.managerUserId || null;
  // If no manager assigned, assign current user (admin/manager) and ensure membership as lead
  if (!managerId && (currentRole === 'admin' || currentRole === 'manager')) {
    const [updated] = await dbi
      .update(teams)
      .set({ managerUserId: currentUserId })
      .where(eq(teams.id, id))
      .returning();
    managerId = updated?.managerUserId || currentUserId;
    await dbi
      .insert(teamMembership)
      .values({ teamId: id, userId: managerId as string, role: 'lead' })
      .onConflictDoNothing();
  }
  if (!managerId) {
    throw new HttpError(400, 'Team has no manager assigned');
  }

  // Create membership request as invitation (unique by userId+managerId) with status 'invited'
  const [reqRow] = await db()
    .insert(teamMembershipRequests)
    .values({ userId, managerId, status: 'invited' })
    .onConflictDoNothing()
    .returning();

  req.log.info({ teamId: id, userId, managerId }, 'team invitation created');
  return res
    .status(201)
    .json({
      success: true,
      data: reqRow || { created: false, reason: 'already_exists' },
      requestId: req.requestId,
    });
});

/**
 * GET /teams/:id/advisors - List advisors eligible (no team, no pending invite to this manager)
 */
export const listEligibleAdvisors = createRouteHandler(async (req: Request) => {
  let teamId: string;
  try {
    teamId = validateUuidParam(req.params.id, 'teamId');
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Invalid team ID format');
  }
  const userId = req.user!.id;
  const role = req.user!.role;

  if (role !== 'admin') {
    const myTeams = await getUserTeams(userId, role);
    const isManager = myTeams.some((t) => t.id === teamId && t.role === 'manager');
    if (!isManager) {
      throw new HttpError(403, 'Access denied');
    }
  }

  const dbi = db();

  // AI_DECISION: Optimizar queries combinando y ejecutando en paralelo
  // Justificación: Reducir de 5 queries secuenciales a 2-3 queries en paralelo
  // Impacto: Reduce latencia significativamente al ejecutar queries independientes simultáneamente

  // Get team info and members in parallel
  const [teamRow, teamMembers, allMembers] = await Promise.all([
    // Manager of this team
    dbi.select().from(teams).where(eq(teams.id, teamId)).limit(1),
    // Members of this team
    dbi
      .select({ userId: teamMembership.userId })
      .from(teamMembership)
      .where(eq(teamMembership.teamId, teamId)),
    // Users that are in any team (enforce one-team policy)
    dbi.select({ userId: teamMembership.userId }).from(teamMembership),
  ]);

  type TeamMemberWithUserId = {
    userId: string | null;
  };
  const teamMemberIds = new Set<string>(
    teamMembers.map((r: TeamMemberWithUserId) => r.userId || '').filter((id: string) => id)
  );
  const anyTeamMemberIds = new Set<string>(
    allMembers.map((r: TeamMemberWithUserId) => r.userId || '').filter((id: string) => id)
  );
  const managerId = teamRow[0]?.managerUserId as string | undefined;

  // Get pending invites and advisors in parallel
  const [pendingInvites, advisors] = await Promise.all([
    // Users with pending invite to this manager
    managerId
      ? dbi
          .select({ userId: teamMembershipRequests.userId })
          .from(teamMembershipRequests)
          .where(
            and(
              eq(teamMembershipRequests.managerId, managerId),
              eq(teamMembershipRequests.status, 'pending')
            )
          )
      : Promise.resolve([]),
    // All advisors
    dbi
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, 'advisor'))
      .limit(500),
  ]);

  const pendingInviteIds = new Set<string>(pendingInvites.map((p: PendingInvite) => p.userId));

  type Advisor = {
    id: string;
  };
  const eligible = advisors.filter(
    (a: Advisor) =>
      !anyTeamMemberIds.has(a.id) && !pendingInviteIds.has(a.id) && !teamMemberIds.has(a.id)
  );

  return eligible;
});
