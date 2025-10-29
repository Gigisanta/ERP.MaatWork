// REGLA CURSOR: Teams management - mantener RBAC, validación Zod, logging estructurado, data isolation
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, teams, teamMembership, users, teamMembershipRequests } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { getUserAccessScope, getTeamMembers, getUserTeams } from '../auth/authorization';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  managerUserId: z.string().uuid().optional().nullable()
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

    res.json({ data: userTeams });
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

    res.json({ data: teamsWithDetails });
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

    const members = await getTeamMembers(userId);
    
    res.json({ data: members });
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

    req.log.info({ teamId: newTeam.id }, 'team created');
    res.status(201).json({ data: newTeam });
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
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, teamId: req.params.id }, 'failed to update team');
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

    // Add member to team
    await db()
      .insert(teamMembership)
      .values({
        teamId: id,
        userId: memberUserId,
        joinedAt: new Date()
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
    res.json({ data: { removed: true } });
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
      .where(eq(teamMembershipRequests.managerId, userId))
      .orderBy(teamMembershipRequests.createdAt);

    res.json({ data: requests });
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

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Verificar que el manager actual es el destinatario de la solicitud
    if (userRole === 'manager' && request.managerId !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only approve requests for your team.' });
    }

    // Buscar el equipo del manager
    const [managerTeam] = await db()
      .select()
      .from(teams)
      .where(eq(teams.managerUserId, request.managerId))
      .limit(1);

    if (!managerTeam) {
      return res.status(400).json({ error: 'Manager does not have a team assigned' });
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

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
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

export default router;
