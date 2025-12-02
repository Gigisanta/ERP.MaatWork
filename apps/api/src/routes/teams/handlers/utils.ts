/**
 * Teams Handlers Utilities
 *
 * Helper functions shared across team CRUD handlers to reduce duplication.
 *
 * ## Contents:
 * - parseTeamId: Validates UUID and returns error response if invalid
 * - checkTeamAccess: Verifies user access to a team
 * - getTeamMembers: Fetches team members with user info
 */
import type { Response } from 'express';
import { db, teamMembership, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getUserTeams } from '../../../auth/authorization';
import { UserRole } from '../../../auth/types';

// Type from getUserTeams return
type UserTeamInfo = { id: string; name: string; role: 'member' | 'manager' };
import { validateUuidParam } from '../../../utils/common-schemas';

// ==========================================================
// Types
// ==========================================================

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

/**
 * Validates a team ID parameter and sends 400 response if invalid.
 * Returns null if validation fails (response already sent).
 *
 * @param paramValue - The raw parameter value from req.params
 * @param res - Express response object
 * @returns The validated UUID string, or null if invalid (response sent)
 *
 * @example
 * ```typescript
 * const teamId = parseTeamId(req.params.id, res);
 * if (!teamId) return; // Response already sent
 * ```
 */
export function parseTeamId(paramValue: string | undefined, res: Response): string | null {
  try {
    return validateUuidParam(paramValue, 'teamId');
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Invalid team ID format',
    });
    return null;
  }
}

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

/**
 * Handles Zod validation errors in a consistent way.
 * Returns true if the error was a ZodError and response was sent.
 *
 * @param err - The error to check
 * @param res - Express response object
 * @returns true if error was handled, false otherwise
 */
export function handleZodError(err: unknown, res: Response): boolean {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}
