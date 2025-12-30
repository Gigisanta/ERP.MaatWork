import { db, users, teamMembership, teams, contacts, aumImportFiles } from '@maatwork/db';
import { eq, and, or, sql, inArray, isNull, type SQL } from 'drizzle-orm';
import { UserRole } from './types';
import { getCachedAccessScope, setCachedAccessScope } from './cache';
import { logger } from '../utils/logger';

export interface AccessScope {
  userId: string;
  role: UserRole;
  accessibleAdvisorIds: string[];
  canSeeUnassigned: boolean;
  canAssignToOthers: boolean;
  canReassign: boolean;
}

interface ContactAccessFilter {
  whereClause: SQL | ReturnType<typeof sql>;
  description: string;
}

/**
 * Get the access scope for a user based on their role and team memberships
 *
 * AI_DECISION: Add in-memory cache with TTL to reduce redundant DB queries
 * Justificaci?n: getUserAccessScope se llama frecuentemente pero cambia raramente (solo cuando cambia team membership)
 * Impacto: Reduce queries redundantes a DB, mejora performance de endpoints que verifican acceso
 */
export async function getUserAccessScope(userId: string, role: UserRole): Promise<AccessScope> {
  // Check cache first
  const cached = getCachedAccessScope(userId, role);
  if (cached) {
    logger.debug({ userId, role }, 'Cache hit for getUserAccessScope');
    return cached;
  }

  // Cache miss - will query DB
  logger.debug({ userId, role }, 'Cache miss for getUserAccessScope');

  // Ensure user exists in database
  const user = await db().select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
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
      // Justificaci?n: Managers deben poder ver los contactos que crean (auto-asignados a su ID)
      // Impacto: Managers pueden ver y gestionar sus propios contactos adem?s de los de su equipo
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
        logger.warn({ userId, err: error }, 'Manager has no team members or team setup issue');
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

    case 'owner':
      // AI_DECISION: Owner ve todas las m?tricas pero NO puede modificar nada
      // Justificaci?n: Rol de direcci?n para visibilidad de negocio sin operaciones
      // Impacto: Acceso global de lectura, sin capacidad de asignaci?n o modificaci?n
      accessibleAdvisorIds = []; // Empty means see all (for metrics)
      canSeeUnassigned = true;
      canAssignToOthers = false; // Cannot assign
      canReassign = false; // Cannot reassign
      break;

    case 'staff':
      // AI_DECISION: Staff (Administrativo) puede ver y gestionar datos operativos
      // Justificaci?n: Rol de soporte para carga de datos, gesti?n de contactos, tareas administrativas
      // Impacto: Acceso amplio de lectura/escritura pero sin administraci?n de usuarios/sistema
      accessibleAdvisorIds = []; // Ve todos los contactos (soporte operativo)
      canSeeUnassigned = true;
      canAssignToOthers = true; // Puede asignar contactos a asesores
      canReassign = true; // Puede reasignar contactos
      break;

    default:
      throw new Error(`Unknown role: ${role}`);
  }

  const scope: AccessScope = {
    userId,
    role,
    accessibleAdvisorIds,
    canSeeUnassigned,
    canAssignToOthers,
    canReassign,
  };

  // Cache the result
  setCachedAccessScope(userId, role, scope);

  return scope;
}

/**
 * Build SQL filter condition for contacts based on user access scope
 */
export function buildContactAccessFilter(accessScope: AccessScope): ContactAccessFilter {
  const { userId, role, accessibleAdvisorIds, canSeeUnassigned } = accessScope;

  // Admin, staff, and owner see everything
  // AI_DECISION: Staff and owner should have same access as admin for contact visibility
  // Justificaci?n: Staff (administrativo) y owner (direcci?n) necesitan ver todos los contactos para operaciones y m?tricas
  // Impacto: Corrige bug donde staff/owner solo ve?an contactos sin asignar en lugar de todos los contactos
  if (role === 'admin' || role === 'staff' || role === 'owner') {
    return {
      whereClause: sql`1=1`, // No filter
      description: `${role} access - no filters`,
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
    logger.warn(
      { userId, role, accessibleAdvisorIds, canSeeUnassigned },
      'buildContactAccessFilter: No access conditions - fail safe'
    );
    return {
      whereClause: sql`1=0`, // No access
      description: 'no access conditions - fail safe',
    };
  }

  // Ensure we have valid conditions before using or()
  if (conditions.length === 1) {
    return {
      whereClause: conditions[0],
      description: `${role} access - 1 condition`,
    };
  }

  return {
    whereClause: or(...conditions)!,
    description: `${role} access - ${conditions.length} condition(s)`,
  };
}

/**
 * Check if a user can access a specific contact
 *
 * AI_DECISION: Accept optional AccessScope parameter to avoid redundant getUserAccessScope calls
 * Justificaci?n: Cuando AccessScope ya est? calculado (ej: en GET /tasks), evita llamada redundante a getUserAccessScope
 * Impacto: Reduce queries N+1 eliminando llamadas redundantes a getUserAccessScope
 *
 * @param userId - User ID
 * @param role - User role
 * @param contactId - Contact ID to check access for
 * @param accessScope - Optional pre-calculated access scope (avoids redundant getUserAccessScope call)
 * @returns Promise<boolean> - True if user can access the contact
 */
export async function canAccessContact(
  userId: string,
  role: UserRole,
  contactId: string,
  accessScope?: AccessScope
): Promise<boolean> {
  try {
    // Use provided accessScope or fetch it if not provided
    const scope = accessScope ?? (await getUserAccessScope(userId, role));
    const filter = buildContactAccessFilter(scope);

    // Query the contact with the access filter
    const contact = await db()
      .select({ id: sql<string>`id` })
      .from(sql`contacts`)
      .where(and(eq(sql`id`, contactId), filter.whereClause))
      .limit(1);

    return contact.length > 0;
  } catch (error) {
    logger.error({ err: error }, 'Error checking contact access');
    return false; // Fail closed
  }
}

/**
 * Check if a user can assign a contact to a specific advisor
 */
export async function canAssignContactTo(
  userId: string,
  role: UserRole,
  targetAdvisorId: string | null
): Promise<boolean> {
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
export async function getTeamMembers(
  managerId: string
): Promise<Array<{ id: string; email: string; fullName: string; role: string }>> {
  const members = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: teamMembership.role, // Return team membership role (lead/member) instead of user system role
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
export async function getUserTeams(
  userId: string,
  role: UserRole
): Promise<Array<{ id: string; name: string; role: 'member' | 'manager' }>> {
  // For managers, get teams they manage
  if (role === 'manager') {
    const managedTeams = await db()
      .select({
        id: teams.id,
        name: teams.name,
        managerUserId: teams.managerUserId,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .where(eq(teams.managerUserId, userId));

    return managedTeams.map(
      (t: { id: string; name: string; managerUserId: string | null; createdAt: Date }) => ({
        id: t.id,
        name: t.name,
        role: 'manager' as const,
      })
    );
  }

  // For advisors, get teams they are members of
  const userTeams = await db()
    .select({
      id: teams.id,
      name: teams.name,
      isManager: eq(teams.managerUserId, userId),
    })
    .from(teams)
    .innerJoin(teamMembership, eq(teams.id, teamMembership.teamId))
    .where(eq(teamMembership.userId, userId));

  return userTeams.map((t: { id: string; name: string; isManager: boolean }) => ({
    id: t.id,
    name: t.name,
    role: t.isManager ? ('manager' as const) : ('member' as const),
  }));
}

/**
 * Check if a user can access a specific AUM import file
 * AI_DECISION: Implement access control for AUM files based on user role
 * Justificaci?n: Los usuarios solo deben poder ver archivos que tienen permiso seg?n su rol
 * Impacto: Previene acceso no autorizado a importaciones de AUM
 */
export async function canAccessAumFile(
  userId: string,
  role: UserRole,
  fileId: string
): Promise<boolean> {
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
    logger.error({ err: error }, 'Error checking AUM file access');
    return false; // Fail closed
  }
}
