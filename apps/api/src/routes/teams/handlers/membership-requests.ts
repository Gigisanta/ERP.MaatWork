/**
 * Teams Membership Requests Handlers
 *
 * GET /teams/membership-requests - List pending requests
 * POST /teams/membership-requests/approve-all - Approve all
 * POST /teams/membership-requests/:id/approve - Approve single
 * POST /teams/membership-requests/:id/reject - Reject
 * DELETE /teams/membership-requests/:id - Delete
 */
import type { Request, Response, NextFunction } from 'express';
import { db, teams, teamMembership, users, teamMembershipRequests } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { validateUuidParam } from '../../../utils/common-schemas';

/**
 * GET /teams/membership-requests - Listar solicitudes pendientes para el manager
 */
export async function listMembershipRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Solo managers y admins pueden ver solicitudes
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Access denied. Only managers can view membership requests.' });
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
        userRole: users.role,
      })
      .from(teamMembershipRequests)
      .innerJoin(users, eq(teamMembershipRequests.userId, users.id))
      .where(
        and(
          eq(teamMembershipRequests.managerId, userId),
          eq(teamMembershipRequests.status, 'pending')
        )
      )
      .orderBy(teamMembershipRequests.createdAt);

    res.json({ success: true, data: requests });
  } catch (err) {
    req.log.error({ err }, 'failed to get membership requests');
    next(err);
  }
}

/**
 * POST /teams/membership-requests/approve-all - Aprobar todas las solicitudes pendientes del manager
 */
export async function approveAllRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = req.user!.id;
    const currentRole = req.user!.role;

    if (currentRole !== 'manager' && currentRole !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Access denied. Only managers or admins can approve requests.' });
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
      .where(
        and(
          eq(teamMembershipRequests.managerId, managerId),
          eq(teamMembershipRequests.status, 'pending')
        )
      );

    // Find or create manager team
    let [managerTeam] = await dbi
      .select()
      .from(teams)
      .where(eq(teams.managerUserId, managerId))
      .limit(1);
    if (!managerTeam) {
      // AI_DECISION: Usar JOIN para obtener team directamente desde teamMembership en lugar de 2 queries separadas.
      // Esto reduce latencia al combinar la búsqueda del lead con la obtención del team en una sola query.
      const leadWithTeam = await dbi
        .select({
          teamId: teams.id,
          name: teams.name,
          description: teams.description,
          managerUserId: teams.managerUserId,
          calendarUrl: teams.calendarUrl,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teamMembership)
        .innerJoin(teams, eq(teams.id, teamMembership.teamId))
        .where(and(eq(teamMembership.userId, managerId), eq(teamMembership.role, 'lead')))
        .limit(1);
      if (leadWithTeam.length > 0) {
        managerTeam = leadWithTeam[0];
      }
    }
    if (!managerTeam) {
      const [newTeam] = await dbi
        .insert(teams)
        .values({ name: `team-${managerId.slice(0, 8)}`, managerUserId: managerId })
        .returning();
      await dbi
        .insert(teamMembership)
        .values({ teamId: newTeam.id, userId: managerId, role: 'lead' })
        .onConflictDoNothing();
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
}

/**
 * POST /teams/membership-requests/:id/approve - Aprobar solicitud de membresía
 */
export async function approveRequest(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'requestId');
    } catch (err) {
      return res
        .status(400)
        .json({ error: err instanceof Error ? err.message : 'Invalid request ID format' });
    }
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
      return res.json({
        success: true,
        data: { approved: request.status === 'approved', alreadyResolved: true },
      });
    }

    // Verificar que el manager actual es el destinatario de la solicitud
    if (userRole === 'manager' && request.managerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Access denied. You can only approve requests for your team.' });
    }

    // Buscar el equipo del manager (fallbacks: rol 'lead' y creación automática si no existe)
    const dbi = db();
    let [managerTeam] = await dbi
      .select()
      .from(teams)
      .where(eq(teams.managerUserId, request.managerId))
      .limit(1);

    if (!managerTeam) {
      // AI_DECISION: Usar JOIN para obtener team directamente desde teamMembership en lugar de 2 queries separadas.
      // Esto reduce latencia al combinar la búsqueda del lead con la obtención del team en una sola query.
      const leadWithTeam = await dbi
        .select({
          teamId: teams.id,
          name: teams.name,
          description: teams.description,
          managerUserId: teams.managerUserId,
          calendarUrl: teams.calendarUrl,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teamMembership)
        .innerJoin(teams, eq(teams.id, teamMembership.teamId))
        .where(and(eq(teamMembership.userId, request.managerId), eq(teamMembership.role, 'lead')))
        .limit(1);
      if (leadWithTeam.length > 0) {
        managerTeam = leadWithTeam[0];
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
        resolvedByUserId: userId,
      })
      .where(eq(teamMembershipRequests.id, id));

    // Agregar el usuario al equipo
    await db()
      .insert(teamMembership)
      .values({
        teamId: managerTeam.id,
        userId: request.userId,
        role: 'member',
      })
      .onConflictDoNothing();

    req.log.info(
      {
        requestId: id,
        userId: request.userId,
        managerId: request.managerId,
      },
      'membership request approved'
    );

    res.json({
      data: { approved: true },
      message: 'Membership request approved successfully',
    });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to approve membership request');
    next(err);
  }
}

/**
 * POST /teams/membership-requests/:id/reject - Rechazar solicitud de membresía
 */
export async function rejectRequest(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'requestId');
    } catch (err) {
      return res
        .status(400)
        .json({ error: err instanceof Error ? err.message : 'Invalid request ID format' });
    }
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
      return res.json({
        success: true,
        data: { rejected: request.status === 'rejected', alreadyResolved: true },
      });
    }

    // Verificar que el manager actual es el destinatario de la solicitud
    if (userRole === 'manager' && request.managerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Access denied. You can only reject requests for your team.' });
    }

    // Actualizar la solicitud como rechazada
    await db()
      .update(teamMembershipRequests)
      .set({
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedByUserId: userId,
      })
      .where(eq(teamMembershipRequests.id, id));

    req.log.info(
      {
        requestId: id,
        userId: request.userId,
        managerId: request.managerId,
      },
      'membership request rejected'
    );

    res.json({
      data: { rejected: true },
      message: 'Membership request rejected',
    });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to reject membership request');
    next(err);
  }
}

/**
 * DELETE /teams/membership-requests/:id - Eliminar solicitud (manager/admin)
 */
export async function deleteRequest(req: Request, res: Response, next: NextFunction) {
  try {
    let id: string;
    try {
      id = validateUuidParam(req.params.id, 'requestId');
    } catch (err) {
      return res
        .status(400)
        .json({ error: err instanceof Error ? err.message : 'Invalid request ID format' });
    }
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only managers can delete requests.' });
    }

    const dbi = db();
    const [request] = await dbi
      .select()
      .from(teamMembershipRequests)
      .where(eq(teamMembershipRequests.id, id))
      .limit(1);
    if (!request) return res.status(404).json({ error: 'Membership request not found' });

    // Managers can only delete their own requests; admins can delete any
    if (userRole === 'manager' && request.managerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Access denied. You can only delete requests for your team.' });
    }

    await dbi.delete(teamMembershipRequests).where(eq(teamMembershipRequests.id, id));
    req.log.info({ requestId: id }, 'membership request deleted');
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    req.log.error({ err, requestId: req.params.id }, 'failed to delete membership request');
    next(err);
  }
}



























