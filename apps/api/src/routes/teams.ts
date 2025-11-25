// REGLA CURSOR: Teams management - mantener RBAC, validación Zod, logging estructurado, data isolation
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, teams, teamMembership, users, teamMembershipRequests } from '@cactus/db';
import { 
  contacts, 
  aumSnapshots, 
  clientPortfolioAssignments, 
  portfolioTemplates,
  portfolioMonitoringSnapshot
} from '@cactus/db/schema';
import { eq, and, notInArray, sum, count, desc, gte, sql, inArray, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { getUserAccessScope, getTeamMembers, getUserTeams } from '../auth/authorization';
import { z } from 'zod';
import { type PendingInvite } from '../types/teams';

type Team = InferSelectModel<typeof teams>;

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  managerUserId: z.string().uuid().optional().nullable(),
  calendarUrl: z.string().url().max(500).optional().nullable()
});

const updateTeamSchema = createTeamSchema.partial();

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'manager']).default('member')
});

// ==========================================================
// GET /teams - Listar equipos
// ==========================================================
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user's teams
    const userTeams = await getUserTeams(userId, userRole);
    
    if (!userTeams || userTeams.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // For each team, get the team details and members
    const teamsWithDetails = await Promise.all(
      userTeams.map(async (team) => {
        try {
          const [teamDetails] = await db()
            .select()
            .from(teams)
            .where(eq(teams.id, team.id))
            .limit(1);

          let members: Array<{ id: string; email: string; fullName: string; role: string }> = [];
          
          // Get members for this specific team
          if (teamDetails && (team.role === 'manager' || userRole === 'admin')) {
            // Query members directly for this team by teamId
            members = await db()
              .select({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: teamMembership.role
              })
              .from(users)
              .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
              .where(eq(teamMembership.teamId, team.id));
          }

          return {
            ...team,
            ...(teamDetails || {}),
            members: members || []
          };
        } catch (teamErr) {
          req.log.error({ err: teamErr, teamId: team.id }, 'error processing team');
          // Return team with empty members on error
          return {
            ...team,
            members: []
          };
        }
      })
    );

    res.json({ success: true, data: teamsWithDetails });
  } catch (err) {
    req.log.error({ err }, 'failed to list teams');
    next(err);
  }
});

// ==========================================================
// GET /teams/my-teams - Obtener equipos del usuario actual
// ==========================================================
router.get('/my-teams', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user's teams with member details
    const userTeams = await getUserTeams(userId, userRole);
    
    // For each team, get the team details and members
    const teamsWithDetails = await Promise.all(
      userTeams.map(async (team) => {
        const [teamDetails] = await db()
          .select()
          .from(teams)
          .where(eq(teams.id, team.id))
          .limit(1);

        const members = team.role === 'manager' 
          ? await getTeamMembers(userId)
          : [];

        return {
          ...team,
          ...teamDetails,
          members
        };
      })
    );

    res.json({ success: true, data: teamsWithDetails });
  } catch (err) {
    req.log.error({ err }, 'failed to get user teams');
    next(err);
  }
});

// ==========================================================
// GET /teams/:id/members - Obtener miembros de un equipo
// ==========================================================
router.get('/:id/members', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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
});

// ==========================================================
// POST /teams - Crear nuevo equipo (managers y admin)
// ==========================================================
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

    req.log.info({ teamId: newTeam.id }, 'team created');
    res.status(201).json({ success: true, data: newTeam });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create team');
    next(err);
  }
});

// ==========================================================
// PUT /teams/:id - Actualizar equipo (solo admin o manager del equipo)
// ==========================================================
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    req.log.info({ teamId: id }, 'team updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to update team');
    next(err);
  }
});

// ==========================================================
// DELETE /teams/:id - Eliminar equipo (solo admin o manager del equipo)
// ==========================================================
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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
});

// ==========================================================
// POST /teams/:id/members - Agregar miembro al equipo
// ==========================================================
router.post('/:id/members', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    req.log.info({ teamId: id, memberUserId }, 'member added to team');
    res.status(201).json({ data: { added: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to add team member');
    next(err);
  }
});

// ==========================================================
// DELETE /teams/:id/members/:userId - Remover miembro del equipo
// ==========================================================
router.delete('/:id/members/:userId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId: memberUserId } = req.params;
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

    req.log.info({ teamId: id, memberUserId }, 'member removed from team');
    res.json({ success: true, data: { removed: true } });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to remove team member');
    next(err);
  }
});

// ==========================================================
// GET /teams/membership-requests - Listar solicitudes pendientes para el manager
// ==========================================================
router.get('/membership-requests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Solo managers y admins pueden ver solicitudes
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers can view membership requests.' });
    }

    const requests = await db()
      .select({
        id: teamMembershipRequests.id,
        userId: teamMembershipRequests.userId,
        managerId: teamMembershipRequests.managerId,
        status: teamMembershipRequests.status,
        createdAt: teamMembershipRequests.createdAt,
        resolvedAt: teamMembershipRequests.resolvedAt,
        resolvedByUserId: teamMembershipRequests.resolvedByUserId,
        // Datos del usuario que solicita
        userEmail: users.email,
        userFullName: users.fullName,
        userRole: users.role
      })
      .from(teamMembershipRequests)
      .innerJoin(users, eq(teamMembershipRequests.userId, users.id))
      .where(and(eq(teamMembershipRequests.managerId, userId), eq(teamMembershipRequests.status, 'pending')))
      .orderBy(teamMembershipRequests.createdAt);

    res.json({ success: true, data: requests });
  } catch (err) {
    req.log.error({ err }, 'failed to get membership requests');
    next(err);
  }
});

// ==========================================================
// POST /teams/membership-requests/:id/approve - Aprobar solicitud de membresía
// ==========================================================
router.post('/membership-requests/:id/approve', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Solo managers y admins pueden aprobar solicitudes
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers can approve requests.' });
    }

    // Obtener la solicitud
    const [request] = await db()
      .select()
      .from(teamMembershipRequests)
      .where(eq(teamMembershipRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Membership request not found' });
    }

    // Idempotencia: si ya fue resuelta, devolver 200
    if (request.status !== 'pending') {
      // If manager is trying to approve an 'invited' record, it's invite-driven; treat as alreadyResolved
      return res.json({ success: true, data: { approved: request.status === 'approved', alreadyResolved: true } });
    }

    // Verificar que el manager actual es el destinatario de la solicitud
    if (userRole === 'manager' && request.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only approve requests for your team.' });
    }

    // Buscar el equipo del manager (fallbacks: rol 'lead' y creación automática si no existe)
    const dbi = db();
    let [managerTeam] = await dbi
      .select()
      .from(teams)
      .where(eq(teams.managerUserId, request.managerId))
      .limit(1);

    if (!managerTeam) {
      const lead = await dbi
        .select({ teamId: teamMembership.teamId })
        .from(teamMembership)
        .where(and(eq(teamMembership.userId, request.managerId), eq(teamMembership.role, 'lead')))
        .limit(1);
      if (lead.length > 0) {
        const [t] = await dbi.select().from(teams).where(eq(teams.id, lead[0].teamId)).limit(1);
        if (t) managerTeam = t;
      }
    }

    if (!managerTeam) {
      // Crear equipo automáticamente para el manager y asignarlo como lead
      const [newTeam] = await dbi
        .insert(teams)
        .values({ name: `team-${request.managerId.slice(0, 8)}`, managerUserId: request.managerId })
        .returning();
      await dbi
        .insert(teamMembership)
        .values({ teamId: newTeam.id, userId: request.managerId, role: 'lead' })
        .onConflictDoNothing();
      managerTeam = newTeam;
    }

    // Actualizar la solicitud como aprobada
    await db()
      .update(teamMembershipRequests)
      .set({
        status: 'approved',
        resolvedAt: new Date(),
        resolvedByUserId: userId
      })
      .where(eq(teamMembershipRequests.id, id));

    // Agregar el usuario al equipo
    await db()
      .insert(teamMembership)
      .values({
        teamId: managerTeam.id,
        userId: request.userId,
        role: 'member'
      })
      .onConflictDoNothing();

    req.log.info({ 
      requestId: id, 
      userId: request.userId, 
      managerId: request.managerId 
    }, 'membership request approved');

    res.json({ 
      data: { approved: true },
      message: 'Membership request approved successfully'
    });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to approve membership request');
    next(err);
  }
});

// ==========================================================
// POST /teams/membership-requests/:id/reject - Rechazar solicitud de membresía
// ==========================================================
router.post('/membership-requests/:id/reject', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Solo managers y admins pueden rechazar solicitudes
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers can reject requests.' });
    }

    // Obtener la solicitud
    const [request] = await db()
      .select()
      .from(teamMembershipRequests)
      .where(eq(teamMembershipRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Membership request not found' });
    }

    // Idempotencia: si ya fue resuelta, devolver 200
    if (request.status !== 'pending') {
      return res.json({ success: true, data: { rejected: request.status === 'rejected', alreadyResolved: true } });
    }

    // Verificar que el manager actual es el destinatario de la solicitud
    if (userRole === 'manager' && request.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only reject requests for your team.' });
    }

    // Actualizar la solicitud como rechazada
    await db()
      .update(teamMembershipRequests)
      .set({
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedByUserId: userId
      })
      .where(eq(teamMembershipRequests.id, id));

    req.log.info({ 
      requestId: id, 
      userId: request.userId, 
      managerId: request.managerId 
    }, 'membership request rejected');

    res.json({ 
      data: { rejected: true },
      message: 'Membership request rejected'
    });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to reject membership request');
    next(err);
  }
});

// ==========================================================
// DELETE /teams/membership-requests/:id - Eliminar solicitud (manager/admin)
// ==========================================================
router.delete('/membership-requests/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers can delete requests.' });
    }

    const dbi = db();
    const [request] = await dbi.select().from(teamMembershipRequests).where(eq(teamMembershipRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Membership request not found' });

    // Managers can only delete their own requests; admins can delete any
    if (userRole === 'manager' && request.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only delete requests for your team.' });
    }

    await dbi.delete(teamMembershipRequests).where(eq(teamMembershipRequests.id, id));
    req.log.info({ requestId: id }, 'membership request deleted');
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to delete membership request');
    next(err);
  }
});

// ==========================================================
// GET /teams/:id/metrics - Obtener métricas del equipo
// ==========================================================
router.get('/:id/metrics', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user is a manager of this team
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some(t => t.id === id && t.role === 'manager');

    if (!isManager && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only team managers can view team metrics.' });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get team members count
    const memberCountResult = await db()
      .select({ count: count() })
      .from(teamMembership)
      .where(eq(teamMembership.teamId, id));

    // Get AUM total del equipo
    const [aumResult] = await db()
      .select({ 
        totalAum: sum(aumSnapshots.aumTotal) 
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(
        and(
          eq(teamMembership.teamId, id),
          eq(aumSnapshots.date, today.toISOString().split('T')[0])
        )
      );

    // Get client count
    const [clientCountResult] = await db()
      .select({ count: count() })
      .from(contacts)
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(
        and(
          eq(teamMembership.teamId, id),
          sql`${contacts.deletedAt} IS NULL`
        )
      );

    // Get risk distribution
    const riskDistributionResult = await db()
      .select({
        riskLevel: portfolioTemplates.riskLevel,
        count: count()
      })
      .from(contacts)
      .innerJoin(clientPortfolioAssignments, eq(clientPortfolioAssignments.contactId, contacts.id))
      .innerJoin(portfolioTemplates, eq(portfolioTemplates.id, clientPortfolioAssignments.templateId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(
        and(
          eq(teamMembership.teamId, id),
          eq(clientPortfolioAssignments.status, 'active')
        )
      )
      .groupBy(portfolioTemplates.riskLevel);

    // Get AUM trend (last 30 days)
    const aumTrendResult = await db()
      .select({
        date: aumSnapshots.date,
        totalAum: sum(aumSnapshots.aumTotal)
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(
        and(
          eq(teamMembership.teamId, id),
          gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0])
        )
      )
      .groupBy(aumSnapshots.date)
      .orderBy(aumSnapshots.date);

    // Get portfolios count
    const [portfolioCountResult] = await db()
      .select({ count: count() })
      .from(clientPortfolioAssignments)
      .innerJoin(contacts, eq(contacts.id, clientPortfolioAssignments.contactId))
      .innerJoin(users, eq(users.id, contacts.assignedAdvisorId))
      .innerJoin(teamMembership, eq(teamMembership.userId, users.id))
      .where(
        and(
          eq(teamMembership.teamId, id),
          eq(clientPortfolioAssignments.status, 'active')
        )
      );

    res.json({ 
      success: true, 
      data: {
        teamAum: aumResult?.totalAum ? Number(aumResult.totalAum) : 0,
        memberCount: memberCountResult[0]?.count || 0,
        clientCount: clientCountResult?.count || 0,
        portfolioCount: portfolioCountResult?.count || 0,
        riskDistribution: riskDistributionResult.map(r => ({
          riskLevel: r.riskLevel,
          count: Number(r.count)
        })),
        aumTrend: aumTrendResult.map(r => ({
          date: r.date,
          value: r.totalAum ? Number(r.totalAum) : 0
        }))
      }
    });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to get team metrics');
    next(err);
  }
});

// ==========================================================
// GET /teams/:id/members/:memberId/metrics - Obtener métricas del miembro
// ==========================================================
router.get('/:id/members/:memberId/metrics', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user is a manager of this team
    const userTeams = await getUserTeams(userId, userRole);
    const isManager = userTeams.some(t => t.id === id && t.role === 'manager');

    if (!isManager && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only team managers can view member metrics.' });
    }

    // Verify member belongs to this team
    const [memberCheck] = await db()
      .select()
      .from(teamMembership)
      .where(
        and(
          eq(teamMembership.teamId, id),
          eq(teamMembership.userId, memberId)
        )
      )
      .limit(1);

    if (!memberCheck) {
      return res.status(404).json({ error: 'Member not found in this team' });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get AUM total del asesor
    const [aumResult] = await db()
      .select({ 
        totalAum: sum(aumSnapshots.aumTotal) 
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(aumSnapshots.date, today.toISOString().split('T')[0])
        )
      );

    // Get client count
    const [clientCountResult] = await db()
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          sql`${contacts.deletedAt} IS NULL`
        )
      );

    // Get portfolios count
    const [portfolioCountResult] = await db()
      .select({ count: count() })
      .from(clientPortfolioAssignments)
      .innerJoin(contacts, eq(contacts.id, clientPortfolioAssignments.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(clientPortfolioAssignments.status, 'active')
        )
      );

    // Get deviation alerts count
    const [deviationAlertsResult] = await db()
      .select({ count: count() })
      .from(portfolioMonitoringSnapshot)
      .innerJoin(contacts, eq(contacts.id, portfolioMonitoringSnapshot.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          eq(portfolioMonitoringSnapshot.asOfDate, today.toISOString().split('T')[0]),
          sql`${portfolioMonitoringSnapshot.totalDeviationPct} > 10`
        )
      );

    // Get AUM trend (last 30 days)
    const aumTrendResult = await db()
      .select({
        date: aumSnapshots.date,
        totalAum: sum(aumSnapshots.aumTotal)
      })
      .from(aumSnapshots)
      .innerJoin(contacts, eq(contacts.id, aumSnapshots.contactId))
      .where(
        and(
          eq(contacts.assignedAdvisorId, memberId),
          gte(aumSnapshots.date, thirtyDaysAgo.toISOString().split('T')[0])
        )
      )
      .groupBy(aumSnapshots.date)
      .orderBy(aumSnapshots.date);

    res.json({ 
      success: true, 
      data: {
        totalAum: aumResult?.totalAum ? Number(aumResult.totalAum) : 0,
        clientCount: clientCountResult?.count || 0,
        portfolioCount: portfolioCountResult?.count || 0,
        deviationAlerts: deviationAlertsResult?.count || 0,
        aumTrend: aumTrendResult.map(r => ({
          date: r.date,
          value: r.totalAum ? Number(r.totalAum) : 0
        }))
      }
    });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id, memberId: req.params.memberId }, 'failed to get member metrics');
    next(err);
  }
});

export default router;
 
// ==========================================================
// Invitations management (create by manager/admin, accept/reject by user)
// ==========================================================

// POST /teams/:id/invitations - Manager/Admin invites an advisor to join the team
router.post('/:id/invitations', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentRole = req.user!.role;

    const bodySchema = z.object({ userId: z.string().uuid() });
    const { userId } = bodySchema.parse(req.body);

    // Only admin or manager of this team can invite
    if (currentRole !== 'admin') {
      const myTeams = await getUserTeams(currentUserId, currentRole);
      const isManager = myTeams.some(t => t.id === id && t.role === 'manager');
      if (!isManager) {
        return res.status(403).json({ error: 'Access denied. Only team managers can invite users.' });
      }
    }

    // Find team and its manager
    const dbi = db();
    const [teamRow] = await dbi.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!teamRow) return res.status(404).json({ error: 'Team not found' });
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
      return res.status(400).json({ error: 'Team has no manager assigned' });
    }

    // Create membership request as invitation (unique by userId+managerId) with status 'invited'
    const [reqRow] = await db()
      .insert(teamMembershipRequests)
      .values({ userId, managerId, status: 'invited' })
      .onConflictDoNothing()
      .returning();

    req.log.info({ teamId: id, userId, managerId }, 'team invitation created');
    return res.status(201).json({ data: reqRow || { created: false, reason: 'already_exists' } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to create invitation');
    next(err);
  }
});

// GET /teams/invitations/pending - Pending invitations for current user
router.get('/invitations/pending', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      .where(and(
        eq(teamMembershipRequests.userId, userId),
        inArray(teamMembershipRequests.status, ['pending', 'invited'])
      ));

    return res.json({ success: true, data: rows });
  } catch (err) {
    req.log.error({ err }, 'failed to list pending invitations');
    next(err);
  }
});

// POST /teams/invitations/:id/accept - Invitee accepts invitation
router.post('/invitations/:id/accept', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;

    const [request] = await db().select().from(teamMembershipRequests).where(eq(teamMembershipRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Invitation not found' });
    if (request.status !== 'pending' && request.status !== 'invited') return res.status(400).json({ error: 'Invitation not pending' });
    if (request.userId !== userId) return res.status(403).json({ error: 'Not your invitation' });

    // Find manager team
    const [managerTeam] = await db().select().from(teams).where(eq(teams.managerUserId, request.managerId)).limit(1);
    if (!managerTeam) return res.status(400).json({ error: 'Manager has no team' });

    await db().insert(teamMembership).values({ teamId: managerTeam.id, userId, role: 'member' }).onConflictDoNothing();
    await db().update(teamMembershipRequests)
      .set({ status: 'approved', resolvedAt: new Date(), resolvedByUserId: userId })
      .where(eq(teamMembershipRequests.id, id));

    req.log.info({ requestId: id, userId, teamId: managerTeam.id }, 'invitation accepted');
    return res.json({ success: true, data: { accepted: true } });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to accept invitation');
    next(err);
  }
});

// POST /teams/invitations/:id/reject - Invitee rejects invitation
router.post('/invitations/:id/reject', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const userId = req.user!.id;

    const [request] = await db().select().from(teamMembershipRequests).where(eq(teamMembershipRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Invitation not found' });
    if (request.status !== 'pending' && request.status !== 'invited') return res.status(400).json({ error: 'Invitation not pending' });
    if (request.userId !== userId) return res.status(403).json({ error: 'Not your invitation' });

    await db().update(teamMembershipRequests)
      .set({ status: 'rejected', resolvedAt: new Date(), resolvedByUserId: userId })
      .where(eq(teamMembershipRequests.id, id));

    req.log.info({ requestId: id, userId }, 'invitation rejected');
    return res.json({ success: true, data: { rejected: true } });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to reject invitation');
    next(err);
  }
});

// GET /teams/:id/advisors - List advisors eligible (no team, no pending invite to this manager)
router.get('/:id/advisors', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params.id;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role !== 'admin') {
      const myTeams = await getUserTeams(userId, role);
      const isManager = myTeams.some(t => t.id === teamId && t.role === 'manager');
      if (!isManager) return res.status(403).json({ error: 'Access denied' });
    }

    const dbi = db();
    // Members of this team
    const teamMembers = await dbi.select({ userId: teamMembership.userId }).from(teamMembership).where(eq(teamMembership.teamId, teamId));
    type TeamMemberWithUserId = {
      userId: string | null;
    };
    const teamMemberIds = new Set<string>(teamMembers.map((r: TeamMemberWithUserId) => r.userId || '').filter(id => id));

    // Users that are in any team (enforce one-team policy)
    const allMembers = await dbi.select({ userId: teamMembership.userId }).from(teamMembership);
    const anyTeamMemberIds = new Set<string>(allMembers.map((r: TeamMemberWithUserId) => r.userId || '').filter(id => id));

    // Manager of this team
    const [teamRow] = await dbi.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    const managerId = teamRow?.managerUserId as string | undefined;

    // Users with pending invite to this manager
    const pendingInviteIds = new Set<string>();
    if (managerId) {
      const pending = await dbi
        .select({ userId: teamMembershipRequests.userId })
        .from(teamMembershipRequests)
        .where(and(eq(teamMembershipRequests.managerId, managerId), eq(teamMembershipRequests.status, 'pending')));
      pending.forEach((p: PendingInvite) => pendingInviteIds.add(p.userId));
    }

    // Advisors not in any team and without pending invite to this manager
    const advisors = await dbi
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, 'advisor'))
      .limit(500);

    type Advisor = {
      id: string;
    };
    const eligible = advisors.filter((a: Advisor) => !anyTeamMemberIds.has(a.id) && !pendingInviteIds.has(a.id) && !teamMemberIds.has(a.id));

    return res.json({ success: true, data: eligible });
  } catch (err) {
    req.log.error({ err, teamId: req.params.id }, 'failed to list advisors');
    next(err);
  }
});

// ==========================================================
// POST /teams/membership-requests/approve-all - Aprobar todas las solicitudes pendientes del manager
// ==========================================================
router.post('/membership-requests/approve-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const currentRole = req.user!.role;

    if (currentRole !== 'manager' && currentRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers or admins can approve requests.' });
    }

    const dbi = db();

    // Select pending requests for this manager (admins: approve-all requires a managerId query param to scope)
    let managerId = currentUserId;
    if (currentRole === 'admin') {
      const fromQuery = (req.query.managerId as string | undefined) || undefined;
      if (fromQuery) managerId = fromQuery;
    }

    const pending = await dbi
      .select()
      .from(teamMembershipRequests)
      .where(and(eq(teamMembershipRequests.managerId, managerId), eq(teamMembershipRequests.status, 'pending')));

    // Find or create manager team
    let [managerTeam] = await dbi.select().from(teams).where(eq(teams.managerUserId, managerId)).limit(1);
    if (!managerTeam) {
      const lead = await dbi
        .select({ teamId: teamMembership.teamId })
        .from(teamMembership)
        .where(and(eq(teamMembership.userId, managerId), eq(teamMembership.role, 'lead')))
        .limit(1);
      if (lead.length > 0) {
        const [t] = await dbi.select().from(teams).where(eq(teams.id, lead[0].teamId)).limit(1);
        if (t) managerTeam = t;
      }
    }
    if (!managerTeam) {
      const [newTeam] = await dbi
        .insert(teams)
        .values({ name: `team-${managerId.slice(0, 8)}`, managerUserId: managerId })
        .returning();
      await dbi.insert(teamMembership).values({ teamId: newTeam.id, userId: managerId, role: 'lead' }).onConflictDoNothing();
      managerTeam = newTeam;
    }

    let approved = 0;
    for (const reqRow of pending) {
      await dbi
        .update(teamMembershipRequests)
        .set({ status: 'approved', resolvedAt: new Date(), resolvedByUserId: currentUserId })
        .where(eq(teamMembershipRequests.id, reqRow.id));
      await dbi
        .insert(teamMembership)
        .values({ teamId: managerTeam.id, userId: reqRow.userId, role: 'member' })
        .onConflictDoNothing();
      approved += 1;
    }

    req.log.info({ managerId, approved }, 'approved all pending membership requests');
    return res.json({ ok: true, approved, teamId: managerTeam.id });
  } catch (err) {
    req.log.error({ err }, 'failed to approve all requests');
    next(err);
  }
});
