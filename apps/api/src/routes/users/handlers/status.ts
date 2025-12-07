/**
 * Users Status Handlers
 *
 * PATCH /users/:id/status - Update user active status
 * POST /users/:id/approve - Approve user
 * POST /users/:id/reject - Reject user
 */
import type { Request } from 'express';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { updateStatusSchema } from '../schemas';

/**
 * PATCH /users/:id/status - Update user active status (admin only)
 */
export const handleUpdateUserStatus = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };

  const [updatedUser] = await db()
    .update(users)
    .set({ isActive })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    throw new HttpError(404, 'User not found');
  }

  req.log.info({ userId: id, isActive }, 'user status updated');

  return updatedUser;
});

/**
 * POST /users/:id/approve - Approve user (admin only)
 */
export const handleApproveUser = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [updatedUser] = await db()
    .update(users)
    .set({ isActive: true })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    throw new HttpError(404, 'User not found');
  }

  req.log.info({ userId: id, email: updatedUser.email }, 'user approved');

  return {
    ...updatedUser,
    message: 'User approved successfully',
  };
});

/**
 * POST /users/:id/reject - Reject user (admin only)
 */
export const handleRejectUser = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  // Obtener datos del usuario antes de eliminarlo
  const [userToDelete] = await db().select().from(users).where(eq(users.id, id)).limit(1);

  if (!userToDelete) {
    throw new HttpError(404, 'User not found');
  }

  // Eliminar usuario rechazado
  await db().delete(users).where(eq(users.id, id));

  req.log.info({ userId: id, email: userToDelete.email }, 'user rejected and deleted');

  return {
    message: 'User rejected and removed from system',
  };
});






















