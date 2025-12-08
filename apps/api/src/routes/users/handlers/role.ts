/**
 * Users Role Handlers
 *
 * PATCH /users/:id/role - Update user role
 */
import type { Request } from 'express';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { updateRoleSchema } from '../schemas';

/**
 * PATCH /users/:id/role - Update user role (admin only)
 */
export const handleUpdateUserRole = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const { role } = req.body as { role: 'admin' | 'manager' | 'advisor' | 'owner' | 'staff' };

  const [updatedUser] = await db().update(users).set({ role }).where(eq(users.id, id)).returning();

  if (!updatedUser) {
    throw new HttpError(404, 'User not found');
  }

  req.log.info({ userId: id, role }, 'user role updated');

  return updatedUser;
});
