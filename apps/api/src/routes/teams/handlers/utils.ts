/**
 * Teams Handlers Utilities
 *
 * Helper functions shared across team CRUD handlers to reduce duplication.
 *
 * ## Contents:
 * - checkTeamAccess: Verifies user access to a team
 * - requireTeamManageAccess: Checks management permissions (returns response)
 * - requireTeamManageAccessOrThrow: Checks management permissions (throws error)
 * - getTeamMembers: Fetches team members with user info
 */
import type { Response } from 'express';
import { db, teamMembership, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { getUserTeams } from '../../../auth/authorization';
import { UserRole } from '../../../auth/types';
import { HttpError } from '../../../utils/route-handler';

// ==========================================================
// Types
// ==========================================================

// Type from getUserTeams return
type UserTeamInfo = { id: string; name: string; role: 'member' | 'manager' };

export interface TeamAccessResult {
  hasAccess: boolean;
  isManager: boolean;
  userTeams: UserTeamInfo[];
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  teamId: string;
  userId: string;
}

// ==========================================================
// UUID Validation Helper
// ==========================================================

// REMOVED: parseTeamId and parseTeamIdOrThrow functions
// Migration completed: All routes now use validate({ params: idParamSchema }) middleware
// See: apps/api/src/routes/teams/index.ts for examples

// ==========================================================
// Access Control Helpers
// ==========================================================

/**
 * Checks if a user has access to a specific team.
 * Returns access info including whether user is a manager.
 *
 * @param userId - The user's ID
 * @param userRole - The user's role (admin, manager, advisor)
 * @param teamId - The team ID to check access for
 * @returns Object with hasAccess, isManager, and userTeams
 */
export async function checkTeamAccess(
  userId: string,
  userRole: UserRole,
  teamId: string
): Promise<TeamAccessResult> {
  // Admins have access to all teams
  if (userRole === 'admin') {
    return { hasAccess: true, isManager: true, userTeams: [] };
  }

  const userTeams = await getUserTeams(userId, userRole);
  const teamInfo = userTeams.find((t) => t.id === teamId);

  return {
    hasAccess: !!teamInfo,
    isManager: teamInfo?.role === 'manager',
    userTeams,
  };
}

/**
 * Checks if user can manage (update/delete) a team.
 * Sends 403 response if access denied.
 *
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @param teamId - The team ID to check
 * @param res - Express response object
 * @param action - The action being attempted (for error message)
 * @returns true if access granted, false if denied (response sent)
 */
export async function requireTeamManageAccess(
  userId: string,
  userRole: UserRole,
  teamId: string,
  res: Response,
  action: 'update' | 'delete'
): Promise<boolean> {
  if (userRole === 'admin') {
    return true;
  }

  const { isManager } = await checkTeamAccess(userId, userRole, teamId);

  if (!isManager) {
    res.status(403).json({
      error: `Access denied. Only team managers can ${action} this team.`,
    });
    return false;
  }

  return true;
}

/**
 * Checks if user can manage (update/delete) a team.
 * Throws HttpError if access denied (for use with createRouteHandler).
 *
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @param teamId - The team ID to check
 * @param action - The action being attempted (for error message)
 * @throws HttpError(403) if access denied
 */
export async function requireTeamManageAccessOrThrow(
  userId: string,
  userRole: UserRole,
  teamId: string,
  action: 'update' | 'delete'
): Promise<void> {
  if (userRole === 'admin') {
    return;
  }

  const { isManager } = await checkTeamAccess(userId, userRole, teamId);

  if (!isManager) {
    throw new HttpError(403, `Access denied. Only team managers can ${action} this team.`);
  }
}

// ==========================================================
// Data Fetching Helpers
// ==========================================================

/**
 * Fetches team members with user information.
 *
 * @param teamId - The team ID to fetch members for
 * @returns Array of team members with user info
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: teamMembership.role,
      teamId: teamMembership.teamId,
      userId: teamMembership.userId,
    })
    .from(users)
    .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
    .where(eq(teamMembership.teamId, teamId));
}

// ==========================================================
// Error Handling Helpers
// ==========================================================

// handleZodError removido - usar middleware validate() en su lugar
