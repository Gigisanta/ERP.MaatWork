/**
 * API methods para teams
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { 
  Team, 
  TeamMember, 
  TeamAdvisor, 
  MembershipRequest, 
  TeamInvitation, 
  TeamInvitationResponse,
  TeamMetrics,
  TeamMemberMetrics
} from '@/types/team';

// ==========================================================
// Request Types
// ==========================================================

export interface CreateTeamRequest {
  name: string;
  managerUserId: string;
  calendarUrl?: string | null;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: 'member' | 'lead';
}

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar equipos
 */
export async function getTeams(): Promise<ApiResponse<Team[]>> {
  return apiClient.get<Team[]>('/v1/teams');
}

/**
 * Obtener equipo por ID
 */
export async function getTeamById(id: string): Promise<ApiResponse<Team>> {
  return apiClient.get<Team>(`/v1/teams/${id}`);
}

/**
 * Crear equipo
 */
export async function createTeam(data: CreateTeamRequest): Promise<ApiResponse<Team>> {
  return apiClient.post<Team>('/v1/teams', data);
}

/**
 * Actualizar equipo
 */
export async function updateTeam(
  id: string,
  data: Partial<CreateTeamRequest>
): Promise<ApiResponse<Team>> {
  return apiClient.put<Team>(`/v1/teams/${id}`, data);
}

/**
 * Eliminar equipo
 */
export async function deleteTeam(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/teams/${id}`);
}

/**
 * Agregar miembro a equipo
 */
export async function addTeamMember(
  teamId: string,
  data: AddTeamMemberRequest
): Promise<ApiResponse<TeamMember>> {
  return apiClient.post<TeamMember>(`/v1/teams/${teamId}/members`, data);
}

/**
 * Remover miembro de equipo
 */
export async function removeTeamMember(
  teamId: string,
  memberId: string
): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/teams/${teamId}/members/${memberId}`);
}

/**
 * Obtener advisors candidatos para un equipo
 */
export async function getTeamAdvisors(teamId: string): Promise<ApiResponse<TeamAdvisor[]>> {
  return apiClient.get<TeamAdvisor[]>(`/v1/teams/${teamId}/advisors`);
}

/**
 * Obtener miembros de un equipo
 */
export async function getTeamMembers(teamId: string): Promise<ApiResponse<TeamMember[]>> {
  return apiClient.get<TeamMember[]>(`/v1/teams/${teamId}/members`);
}

/**
 * Crear invitación a equipo
 */
export async function createTeamInvitation(
  teamId: string,
  data: { userId?: string; email?: string }
): Promise<ApiResponse<TeamInvitationResponse>> {
  return apiClient.post<TeamInvitationResponse>(`/v1/teams/${teamId}/invitations`, data);
}

/**
 * Obtener solicitudes de membresía
 */
export async function getMembershipRequests(): Promise<ApiResponse<MembershipRequest[]>> {
  return apiClient.get<MembershipRequest[]>('/v1/teams/membership-requests');
}

/**
 * Responder a solicitud de membresía
 */
export async function respondToMembershipRequest(
  requestId: string,
  action: 'accept' | 'reject'
): Promise<ApiResponse<void>> {
  return apiClient.post<void>(`/v1/teams/membership-requests/${requestId}/${action}`);
}

/**
 * Obtener invitaciones pendientes del usuario actual
 */
export async function getPendingInvitations(): Promise<ApiResponse<TeamInvitation[]>> {
  return apiClient.get<TeamInvitation[]>('/v1/teams/invitations/pending');
}

/**
 * Responder a invitación
 */
export async function respondToInvitation(
  invitationId: string,
  action: 'accept' | 'reject'
): Promise<ApiResponse<void>> {
  return apiClient.post<void>(`/v1/teams/invitations/${invitationId}/${action}`);
}

/**
 * Invitar miembro a equipo (alternativa endpoint)
 */
export async function inviteTeamMember(
  data: { teamId: string; userId?: string; email?: string }
): Promise<ApiResponse<TeamInvitationResponse>> {
  return apiClient.post<TeamInvitationResponse>('/v1/teams/invite-member', data);
}

/**
 * Obtener todos los miembros de todos los equipos (para admin)
 */
export async function getAllTeamMembers(): Promise<ApiResponse<TeamMember[]>> {
  return apiClient.get<TeamMember[]>('/v1/teams/members');
}

/**
 * Obtener métricas del equipo
 */
export async function getTeamMetrics(teamId: string): Promise<ApiResponse<TeamMetrics>> {
  return apiClient.get<TeamMetrics>(`/v1/teams/${teamId}/metrics`);
}

/**
 * Obtener métricas del miembro del equipo
 */
export async function getTeamMemberMetrics(
  teamId: string,
  memberId: string
): Promise<ApiResponse<TeamMemberMetrics>> {
  return apiClient.get<TeamMemberMetrics>(`/v1/teams/${teamId}/members/${memberId}/metrics`);
}

