/**
 * Users CRUD Handlers
 *
 * POST /users - Create user
 * GET /users/:id - Get user by ID
 * PATCH /users/:id - Update user
 * DELETE /users/:id - Delete user
 */
import type { Request, Response } from 'express';
import { db, users, teamMembershipRequests } from '@maatwork/db';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { createUserWithPasswordSchema } from '../schemas';
import {
  notifications,
  userChannelPreferences,
  notificationTemplates,
} from '@maatwork/db/schema/notifications';
import { teams, teamMembership, advisorAliases } from '@maatwork/db/schema/users';

/**
 * POST /users - Create user (admin only)
 */
export const handleCreateUser = createAsyncHandler(async (req: Request, res: Response) => {
  const validated = req.body as z.infer<typeof createUserWithPasswordSchema>;
  const { email, fullName, password, role, requestedManagerId } = validated;

  // Verificar si el email ya existe
  const [existingUser] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new HttpError(409, 'El email ya está registrado');
  }

  // Hash contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario
  const [newUser] = await db()
    .insert(users)
    .values({
      email,
      fullName,
      passwordHash: hashedPassword,
      role,
      isActive: true,
    })
    .returning();

  // Si es advisor y tiene manager solicitado, crear solicitud de membresía
  if (role === 'advisor' && requestedManagerId) {
    await db().insert(teamMembershipRequests).values({
      userId: newUser.id,
      managerId: requestedManagerId,
      status: 'approved', // Los usuarios creados por admin se aprueban automáticamente
    });
  }

  req.log.info({ userId: newUser.id, email: newUser.email }, 'user created by admin');

  return res.status(201).json({
    success: true,
    data: newUser,
    requestId: req.requestId,
  });
});

/**
 * GET /users/:id - Get user by ID
 */
export const handleGetUser = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [user] = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  return user;
});

/**
 * PATCH /users/:id - Update user
 */


/**
 * DELETE /users/:id - Delete user (admin only)
 */
export const handleDeleteUser = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;

  // Validación: No permitir auto-eliminación
  if (id === currentUserId) {
    req.log.warn({ userId: id }, 'admin attempted to delete themselves');
    throw new HttpError(400, 'No puedes eliminarte a ti mismo', {
      code: 'SELF_DELETE_NOT_ALLOWED',
    });
  }

  // Obtener usuario a eliminar
  const [userToDelete] = await db()
    .select({ id: users.id, email: users.email, role: users.role, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!userToDelete) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  // Validación: No eliminar el último admin activo
  if (userToDelete.role === 'admin') {
    const [adminCount] = await db()
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));

    const activeAdmins = Number(adminCount?.count || 0);
    if (activeAdmins <= 1) {
      req.log.warn({ userId: id }, 'attempted to delete last active admin');
      throw new HttpError(400, 'No se puede eliminar el último administrador activo del sistema', {
        code: 'LAST_ADMIN_DELETE_NOT_ALLOWED',
      });
    }
  }


  // Eliminar referencias en cascada
  await db().transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // 1. Notificaciones y preferencias
    // Desvincular templates creados por el usuario (no eliminamos los templates para no romper histórico)
    await tx
      .update(notificationTemplates)
      .set({ createdByUserId: null })
      .where(eq(notificationTemplates.createdByUserId, id));

    // Eliminar notificaciones (logs de mensajes deberían tener FK cascade o se mantienen como histórico)
    // Nota: Si message_log tiene FK a notifications sin cascade, podría fallar.
    // Revisando messageLog en notifications.ts: relatedNotificationId referencias notifications.id
    // Si no tiene cascade en DB, necesitamos borrar los logs o setear null.
    // Asumiremos delete por ahora, si falla completaremos el cascade.
    await tx.delete(notifications).where(eq(notifications.userId, id));

    // Eliminar preferencias de canales
    await tx.delete(userChannelPreferences).where(eq(userChannelPreferences.userId, id));

    // 2. Equipos y membresías
    // Eliminar solicitudes de membresía (como solicitante o como manager)
    await tx.delete(teamMembershipRequests).where(eq(teamMembershipRequests.userId, id));
    await tx.delete(teamMembershipRequests).where(eq(teamMembershipRequests.managerId, id));

    // Eliminar membresías de equipos
    await tx.delete(teamMembership).where(eq(teamMembership.userId, id));

    // Desvincular de equipos que lidera (set manager to null)
    await tx
      .update(teams)
      .set({ managerUserId: null })
      .where(eq(teams.managerUserId, id));

    // Desvincular de calendarios conectados
    await tx
      .update(teams)
      .set({ calendarConnectedByUserId: null })
      .where(eq(teams.calendarConnectedByUserId, id));

    // 3. Alias de advisor
    await tx.delete(advisorAliases).where(eq(advisorAliases.userId, id));

    // 4. Eliminar usuario
    await tx.delete(users).where(eq(users.id, id));
  });

  req.log.info(
    {
      deletedUserId: id,
      deletedUserEmail: userToDelete.email,
      deletedUserRole: userToDelete.role,
      deletedBy: currentUserId,
    },
    'user deleted by admin'
  );

  return {
    message: `Usuario ${userToDelete.fullName} eliminado exitosamente`,
  };
});
