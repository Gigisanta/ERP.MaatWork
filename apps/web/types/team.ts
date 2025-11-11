/**
 * Tipos relacionados con teams/equipos
 */

import type { TimestampedEntity } from './common';
import type { User } from './auth';

/**
 * Rol de miembro de equipo
 */
export type TeamMemberRole = 'member' | 'lead';

/**
 * Equipo base - extiende TimestampedEntity
 */
export interface Team extends TimestampedEntity {
  name: string;
  managerUserId: string;
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
 * Advisor candidato para equipo
 */
export interface TeamAdvisor extends Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'active'> {}

/**
 * Estado de solicitud de membresía
 */
export type MembershipRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Solicitud de membresía a equipo - extiende TimestampedEntity
 */
export interface MembershipRequest extends TimestampedEntity {
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
}