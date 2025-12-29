/**
 * Team Types - Shared team-related types
 * 
 * These types are used by both API and Web applications.
 */

import type { TimestampedEntity, UserRole } from './common';
import type { User } from './user';

/**
 * Team member role
 */
export type TeamMemberRole = 'member' | 'lead';

/**
 * Team base interface
 */
export interface Team extends TimestampedEntity {
  name: string;
  description?: string | null;
  managerUserId: string;
  calendarUrl?: string | null;
  calendarId?: string | null;
  meetingRoomCalendarId?: string | null;
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
  user?: Pick<User, 'id' | 'email' | 'fullName' | 'role'>;
}

/**
 * Team advisor candidate (or any user that can join a team)
 */
export interface TeamAdvisor {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  currentTeamId?: string | null;
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
  team?: Pick<Team, 'id' | 'name'>;
  user?: User;
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
  team?: Pick<Team, 'id' | 'name'>;
  invitedUser?: User;
}

/**
 * Team invitation response
 */
export interface TeamInvitationResponse {
  invitation: TeamInvitation;
  message?: string;
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
  lastLogin: string | null;
  daysSinceLogin: number | null;
  contactsCreatedThisMonth: number;
  contactsCreatedLast30Days: number;
  firstMeetingsLast30Days: number;
  secondMeetingsLast30Days: number;
  tasksCompletedLast30Days: number;
  notesCreatedLast30Days: number;
}

/**
 * Team member activity summary for list view
 */
export interface TeamMemberActivity {
  id: string;
  email: string;
  fullName: string;
  role: TeamMemberRole;
  lastLogin: string | null;
  daysSinceLogin: number | null;
  isActive: boolean;
  contactsCreatedThisMonth: number;
  contactsCreatedLast30Days: number;
  firstMeetingsLast30Days: number;
  secondMeetingsLast30Days: number;
  tasksCompletedLast30Days: number;
  openTasks: number;
  clientCount: number;
  totalAum: number;
  activityStatus: 'active' | 'moderate' | 'inactive' | 'critical';
}

/**
 * Team goal
 */
export interface TeamGoal {
  type: string;
  target: number;
  actual: number;
  month: number;
  year: number;
}

/**
 * Set team goal request
 */
export interface SetTeamGoalRequest {
  type: string;
  target: number;
  month: number;
  year: number;
}

/**
 * Stalled lead
 */
export interface StalledLead {
  id: string;
  fullName: string;
  assignedAdvisorId: string;
  contactLastTouchAt: string;
}

/**
 * Reassign leads request
 */
export interface ReassignLeadsRequest {
  contactIds: string[];
  newAdvisorId: string;
}

/**
 * Team capacity member metrics
 */
export interface TeamCapacityMember {
  id: string;
  name: string;
  metrics: {
    activeClients: number;
    openTasks: number;
    newLeads: number;
  };
  score: number;
  status: 'optimal' | 'low' | 'overloaded';
}

/**
 * Pending invite internal type
 */
export interface PendingInvite {
  id: string;
  userId: string;
}
