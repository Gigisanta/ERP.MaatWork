/**
 * Tipos relacionados con teams/equipos
 */

import type { User } from './auth';

/**
 * Equipo base
 */
export interface Team {
  id: string;
  name: string;
  managerUserId: string;
  createdAt: string;
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
  role: 'member' | 'lead';
  email?: string;
  fullName?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

/**
 * Advisor candidato para equipo
 */
export interface TeamAdvisor {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
}

/**
 * Solicitud de membresía a equipo
 */
export interface MembershipRequest {
  id: string;
  teamId: string;
  userId: string;
  requestedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  };
  user?: User;
}

/**
 * Invitación a equipo
 */
export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedBy: string;
  invitedUserId?: string;
  invitedEmail?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  };
  invitedUser?: User;
}

/**
 * Respuesta de invitación/creación de invitación
 */
export interface TeamInvitationResponse {
  invitation: TeamInvitation;
  message?: string;
}

