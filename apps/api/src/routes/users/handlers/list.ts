import type { Request } from 'express';
import { db, users } from '@maatwork/db';
import { eq, and, sql } from 'drizzle-orm';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { parsePaginationParams, formatPaginatedResponse } from '../../../utils/pagination';

/**
 * GET /users - List users with pagination
 */
export const handleListUsers = createRouteHandler(async (req: Request) => {
  const pagination = parsePaginationParams(req.query);
  const { limit, offset } = pagination;
  const { isActive } = req.query as { isActive?: 'true' | 'false' };

  // Construct where clause
  const whereConditions = [];
  if (isActive !== undefined) {
    whereConditions.push(eq(users.isActive, isActive === 'true'));
  }
  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count for pagination metadata
  const [countResult] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(whereClause);
  const total = Number(countResult?.count || 0);

  // Get paginated users with only necessary fields (exclude passwordHash)
  const all = await db()
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
    .where(whereClause)
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);

  return formatPaginatedResponse(all, total, pagination);
});

/**
 * GET /users/pending - List pending users (admin only)
 */
export const handleListPendingUsers = createRouteHandler(async (req: Request) => {
  const pendingUsers = await db()
    .select()
    .from(users)
    .where(eq(users.isActive, false))
    .orderBy(users.createdAt);

  return pendingUsers;
});

/**
 * GET /users/managers - List active managers (public for registration)
 */
export const handleListManagers = createRouteHandler(async (req: Request) => {
  const managers = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(and(eq(users.role, 'manager'), eq(users.isActive, true)))
    .orderBy(users.fullName);

  return managers;
});

/**
 * GET /users/advisors - List active advisors
 */
export const handleListAdvisors = createRouteHandler(async (req: Request) => {
  const advisors = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(and(eq(users.role, 'advisor'), eq(users.isActive, true)))
    .orderBy(users.fullName);

  return advisors;
});
