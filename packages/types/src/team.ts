/**
 * Team Types - Shared team-related types
 * 
 * These types are used by both API and Web applications.
 */

import type { TimestampedEntity, UserRole } from './common';

/**
 * Team member role
 */
export type TeamMemberRole = 'member' | 'lead' | 'manager';

/**
 * Team base interface
 */
export interface Team extends TimestampedEntity {
  name: string;
  description?: string | null;
  managerUserId: string;
  calendarUrl?: string | null;
  members?: TeamMember[];
  role?: string; // Current user's role in the team
}

/**
 * Team member
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  email?: string;
  fullName?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

/**
 * Team advisor candidate
 */
export interface TeamAdvisor {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
}

/**
 * Membership request status
 */
export type MembershipRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Membership request
 */
export interface MembershipRequest extends TimestampedEntity {
  teamId: string;
  userId: string;
  requestedBy: string;
  status: MembershipRequestStatus;
  team?: { id: string; name: string };
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

/**
 * Team invitation status
 */
export type TeamInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/**
 * Team invitation
 */
export interface TeamInvitation extends TimestampedEntity {
  teamId: string;
  invitedBy: string;
  invitedUserId?: string;
  invitedEmail?: string;
  status: TeamInvitationStatus;
  expiresAt?: string;
  team?: { id: string; name: string };
}

/**
 * Team metrics
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
 * Risk distribution item
 */
export interface RiskDistributionItem {
  riskLevel: string;
  count: number;
}

/**
 * AUM trend item
 */
export interface AumTrendItem {
  date: string;
  value: number;
}

/**
 * Team member metrics
 */
export interface TeamMemberMetrics {
  totalAum: number;
  clientCount: number;
  portfolioCount: number;
  deviationAlerts: number;
  aumTrend: AumTrendItem[];
}






































