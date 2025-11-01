import { db, users, teamMembership, teams, contacts, aumImportFiles } from '@cactus/db';
import { eq, and, or, sql, inArray, isNull } from 'drizzle-orm';
import { UserRole } from './types';

export interface AccessScope {
  userId: string;
  role: UserRole;
  accessibleAdvisorIds: string[];
  canSeeUnassigned: boolean;
  canAssignToOthers: boolean;
  canReassign: boolean;
}

export interface ContactAccessFilter {
  whereClause: any;
  description: string;
}

/**
 * Get the access scope for a user based on their role and team memberships
 */
export async function getUserAccessScope(userId: string, role: UserRole): Promise<AccessScope> {
  // Ensure user exists in database
  const user = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  if (user.length === 0) {
    throw new Error(`User ${userId} not found in database`);
  }

  let accessibleAdvisorIds: string[] = [];
  let canSeeUnassigned = false;
  let canAssignToOthers = false;
  let canReassign = false;

  switch (role) {
    case 'admin':
      // Admins see everything and can do everything
      accessibleAdvisorIds = []; // Empty means no filter (see all)
      canSeeUnassigned = true;
      canAssignToOthers = true;
      canReassign = true;
      break;

    case 'manager':
      // AI_DECISION: Managers see their own contacts + team members' contacts + unassigned
      // Justificación: Managers deben poder ver los contactos que crean (auto-asignados a su ID)
      // Impacto: Managers pueden ver y gestionar sus propios contactos además de los de su equipo
      try {
        const teamMembers = await db()
          .select({ id: users.id })
          .from(users)
          .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
          .innerJoin(teams, eq(teamMembership.teamId, teams.id))
          .where(eq(teams.managerUserId, userId));

        // Include manager's own ID so they can see contacts they created
        accessibleAdvisorIds = [userId, ...teamMembers.map((m: { id: string }) => m.id)];
      } catch (error) {
        // AI_DECISION: Mantener console.warn aquí por ser función de utilidad sin request context
        // Justificación: getUserAccessScope no tiene acceso a req.log, y es llamado antes de handlers
        // Impacto: Este warning es de configuración/setup, aceptable en console
        // TODO: Considerar logger global si se vuelve problemático
        console.warn(`Manager ${userId} has no team members or team setup issue:`, error);
        // Even without team members, manager should see their own contacts
        accessibleAdvisorIds = [userId];
      }
      canSeeUnassigned = true;
      canAssignToOthers = true;
      canReassign = true;
      break;

    case 'advisor':
      // Advisors only see their own contacts
      accessibleAdvisorIds = [userId];
      canSeeUnassigned = false;
      canAssignToOthers = false;
      canReassign = false;
      break;

    default:
      throw new Error(`Unknown role: ${role}`);
  }

  return {
    userId,
    role,
    accessibleAdvisorIds,
    canSeeUnassigned,
    canAssignToOthers,
    canReassign
  };
}

/**
 * Build SQL filter condition for contacts based on user access scope
 */
export function buildContactAccessFilter(accessScope: AccessScope): ContactAccessFilter {
  const { userId, role, accessibleAdvisorIds, canSeeUnassigned } = accessScope;

  // Admin sees everything
  if (role === 'admin') {
    return {
      whereClause: sql`1=1`, // No filter
      description: 'admin access - no filters'
    };
  }

  // Build conditions for assigned contacts
  const conditions = [];
  
  // Add condition for accessible advisor IDs (defensive check for empty array)
  if (accessibleAdvisorIds && accessibleAdvisorIds.length > 0) {
    conditions.push(inArray(contacts.assignedAdvisorId, accessibleAdvisorIds));
  }

  // Add condition for unassigned contacts (if user can see them)
  if (canSeeUnassigned) {
    conditions.push(isNull(contacts.assignedAdvisorId));
  }

  // Defensive check: ensure we always have at least one condition
  if (conditions.length === 0) {
    // This shouldn't happen in normal operation, but fail safe
    console.warn(`buildContactAccessFilter: No access conditions for user ${userId} with role ${role}. accessibleAdvisorIds: ${JSON.stringify(accessibleAdvisorIds)}, canSeeUnassigned: ${canSeeUnassigned}`);
    return {
      whereClause: sql`1=0`, // No access
      description: 'no access conditions - fail safe'
    };
  }

  // Ensure we have valid conditions before using or()
  if (conditions.length === 1) {
    return {
      whereClause: conditions[0],
      description: `${role} access - 1 condition`
    };
  }

  return {
    whereClause: or(...conditions)!,
    description: `${role} access - ${conditions.length} condition(s)`
  };
}

/**
 * Check if a user can access a specific contact
 */
export async function canAccessContact(userId: string, role: UserRole, contactId: string): Promise<boolean> {
  try {
    const accessScope = await getUserAccessScope(userId, role);
    const filter = buildContactAccessFilter(accessScope);
    
    // Query the contact with the access filter
    const contact = await db()
      .select({ id: sql<string>`id` })
      .from(sql`contacts`)
      .where(and(eq(sql`id`, contactId), filter.whereClause))
      .limit(1);

    return contact.length > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false; // Fail closed
  }
}

/**
 * Check if a user can assign a contact to a specific advisor
 */
export async function canAssignContactTo(userId: string, role: UserRole, targetAdvisorId: string | null): Promise<boolean> {
  const accessScope = await getUserAccessScope(userId, role);
  
  // Admin can assign to anyone
  if (role === 'admin') {
    return true;
  }

  // Manager can assign to team members or leave unassigned
  if (role === 'manager') {
    return targetAdvisorId === null || accessScope.accessibleAdvisorIds.includes(targetAdvisorId);
  }

  // Advisor can only assign to themselves
  if (role === 'advisor') {
    return targetAdvisorId === userId;
  }

  return false;
}

/**
 * Get team members for a manager (for dropdowns, etc.)
 */
export async function getTeamMembers(managerId: string): Promise<Array<{ id: string; email: string; fullName: string; role: string }>> {
  const members = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role
    })
    .from(users)
    .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
    .innerJoin(teams, eq(teamMembership.teamId, teams.id))
    .where(eq(teams.managerUserId, managerId));

  return members;
}

/**
 * Get all teams where a user is a member or manager
 */
export async function getUserTeams(userId: string, role: UserRole): Promise<Array<{ id: string; name: string; role: 'member' | 'manager' }>> {
  // For managers, get teams they manage
  if (role === 'manager') {
    const managedTeams = await db()
      .select({
        id: teams.id,
        name: teams.name,
        managerUserId: teams.managerUserId,
        createdAt: teams.createdAt
      })
      .from(teams)
      .where(eq(teams.managerUserId, userId));

    return managedTeams.map((t: { id: string; name: string; managerUserId: string | null; createdAt: Date }) => ({
      id: t.id,
      name: t.name,
      role: 'manager' as const
    }));
  }

  // For advisors, get teams they are members of
  const userTeams = await db()
    .select({
      id: teams.id,
      name: teams.name,
      isManager: eq(teams.managerUserId, userId)
    })
    .from(teams)
    .innerJoin(teamMembership, eq(teams.id, teamMembership.teamId))
    .where(eq(teamMembership.userId, userId));

  return userTeams.map((t: { id: string; name: string; isManager: boolean }) => ({
    id: t.id,
    name: t.name,
    role: t.isManager ? 'manager' as const : 'member' as const
  }));
}

/**
 * Check if a user can access a specific AUM import file
 * AI_DECISION: Implement access control for AUM files based on user role
 * Justificación: Los usuarios solo deben poder ver archivos que tienen permiso según su rol
 * Impacto: Previene acceso no autorizado a importaciones de AUM
 */
export async function canAccessAumFile(userId: string, role: UserRole, fileId: string): Promise<boolean> {
  try {
    // Admin can access all files
    if (role === 'admin') {
      return true;
    }

    // Get the file to check who uploaded it
    const [file] = await db()
      .select({ uploadedByUserId: aumImportFiles.uploadedByUserId })
      .from(aumImportFiles)
      .where(eq(aumImportFiles.id, fileId))
      .limit(1);

    if (!file) {
      return false; // File doesn't exist
    }

    // Advisor can only access their own files
    if (role === 'advisor') {
      return file.uploadedByUserId === userId;
    }

    // Manager can access their own files and team members' files
    if (role === 'manager') {
      if (file.uploadedByUserId === userId) {
        return true; // Own file
      }

      // Check if file was uploaded by a team member
      const accessScope = await getUserAccessScope(userId, role);
      return accessScope.accessibleAdvisorIds.includes(file.uploadedByUserId);
    }

    return false; // Unknown role or no access
  } catch (error) {
    console.error('Error checking AUM file access:', error);
    return false; // Fail closed
  }
}
