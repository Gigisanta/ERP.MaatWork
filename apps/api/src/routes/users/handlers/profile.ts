/**
 * Users Profile Handlers
 *
 * GET /users/me - Get current user profile
 * PATCH /users/me - Update current user profile
 */
import type { Request } from 'express';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { updateProfileSchema } from '../schemas';

/**
 * GET /users/me - Get current user profile
 */
export const handleGetCurrentUser = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  const [user] = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  return user;
});

/**
 * PATCH /users/me - Update current user profile
 */
export const handleUpdateCurrentUserProfile = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const { phone, fullName } = req.body as { phone: string; fullName?: string };

  const updateData: { phone: string; fullName?: string; updatedAt: Date } = {
    phone,
    updatedAt: new Date(),
  };

  if (fullName !== undefined) {
    updateData.fullName = fullName;
  }

  const [updatedUser] = await db()
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    });

  if (!updatedUser) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  req.log.info({ userId, phone }, 'user profile updated');

  return updatedUser;
});
