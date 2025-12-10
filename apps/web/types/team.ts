/**
 * Tipos relacionados con teams/equipos
 */

import type { TimestampedEntity } from '@cactus/types/common';
import type { User } from './auth';

/**
 * Rol de miembro de equipo
 */
export type TeamMemberRole = 'member' | 'lead';

/**
 * Equipo base - extiende TimestampedEntity
 */
export interface Team extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  createdAt: string | Date; // Explicitly include createdAt from TimestampedEntity for TypeScript resolution
  name: string;
  managerUserId: string;
  calendarUrl?: string | null;
  members?: TeamMember[];
  role?: string; // Role del usuario actual en el equipo
}

/**
 * Miembro de equipo
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  email?: string;
  fullName?: string;
  user?: Pick<User, 'id' | 'email' | 'fullName' | 'role'>;
}

/**
 * Usuario candidato para equipo (puede ser advisor, manager, o admin)
 * 
 * AI_DECISION: Rename from TeamAdvisor to reflect that it's not just advisors
 * Justificación: Teams can now include managers, administratives, and advisors
 * Impacto: More accurate type naming, better reflects actual usage
 * 
 * AI_DECISION: Use isActive instead of active to match API response format
 * Justificación: Backend returns isActive (from UserApiResponse), not active (from User)
 * Impacto: Type matches actual API response structure
 */
export interface TeamAdvisor {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  /**
   * ID del equipo actual del usuario (si está en otro equipo)
   * null si el usuario no está en ningún equipo
   */
  currentTeamId?: string | null;
}

/**
 * Estado de solicitud de membresía
 */
export type MembershipRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Solicitud de membresía a equipo - extiende TimestampedEntity
 */
export interface MembershipRequest extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  createdAt: string | Date; // Explicitly include createdAt from TimestampedEntity for TypeScript resolution
  teamId: string;
  userId: string;
  requestedBy: string;
  status: MembershipRequestStatus;
  team?: Pick<Team, 'id' | 'name'>;
  user?: User;
}

/**
 * Estado de invitación a equipo
 */
export type TeamInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/**
 * Invitación a equipo - extiende TimestampedEntity
 */
export interface TeamInvitation extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  createdAt: string | Date; // Explicitly include createdAt from TimestampedEntity for TypeScript resolution
  teamId: string;
  invitedBy: string;
  invitedUserId?: string;
  invitedEmail?: string;
  status: TeamInvitationStatus;
  expiresAt?: string;
  team?: Pick<Team, 'id' | 'name'>;
  invitedUser?: User;
}

/**
 * Response de invitación/creación de invitación
 */
export interface TeamInvitationResponse {
  invitation: TeamInvitation;
  message?: string;
}

/**
 * Distribución de riesgo
 */
export interface RiskDistributionItem {
  riskLevel: string;
  count: number;
}

/**
 * Tendencias AUM
 */
export interface AumTrendItem {
  date: string;
  value: number;
}

/**
 * Métricas del equipo
 */
export interface TeamMetrics {
  teamAum: number;
  memberCount: number;
  clientCount: number;
  portfolioCount: number;
  riskDistribution: RiskDistributionItem[];
  aumTrend: AumTrendItem[];
}

/**
 * Métricas del miembro del equipo
 */
export interface TeamMemberMetrics {
  totalAum: number;
  clientCount: number;
  portfolioCount: number;
  deviationAlerts: number;
  aumTrend: AumTrendItem[];
  // Métricas de actividad
  lastLogin: string | null;
  daysSinceLogin: number | null;
  contactsCreatedThisMonth: number;
  contactsCreatedLast30Days: number;
  notesCreatedLast30Days: number;
  tasksCompletedLast30Days: number;
}

/**
 * Resumen de actividad de un miembro para lista de equipo
 */
export interface TeamMemberActivity {
  id: string;
  email: string;
  fullName: string;
  role: TeamMemberRole;
  // Métricas de actividad
  lastLogin: string | null;
  daysSinceLogin: number | null;
  isActive: boolean;
  // Métricas de rendimiento
  contactsCreatedThisMonth: number;
  contactsCreatedLast30Days: number;
  notesCreatedLast30Days: number;
  tasksCompletedLast30Days: number;
  clientCount: number;
  totalAum: number;
  // Status de actividad
  activityStatus: 'active' | 'moderate' | 'inactive' | 'critical';
}
