/**
 * API methods para teams
 */

import { apiClient } from './client';
import type { ApiResponse } from '../api-client';
import type {
  Team,
  TeamMember,
  TeamAdvisor,
  MembershipRequest,
  TeamInvitation,
  TeamInvitationResponse,
  TeamMetrics,
  TeamMemberMetrics,
  TeamMemberActivity,
  TeamGoal,
  SetTeamGoalRequest,
  StalledLead,
  ReassignLeadsRequest,
  TeamCapacityMember,
} from '@/types';

// ==========================================================
// Request Types
// ==========================================================

interface CreateTeamRequest {
  name: string;
  managerUserId: string;
  calendarUrl?: string | null;
}

interface AddTeamMemberRequest {
  userId: string;
  role?: 'member' | 'lead';
}

// ==========================================================
// Dashboard Types
// ==========================================================

export interface MemberDashboardResponse {
  hasTeam: boolean;
  team: {
    id: string;
    name: string;
    managerName: string | null;
    calendarUrl: string | null;
    calendarId: string | null;
    role: string;
  } | null;
  metrics: {
    totalAum: number;
    newContactsMonth: number;
    totalClients: number;
    newContactsThisMonth: number;
    openTasks: number;
    firstMeetingsLast30Days: number;
    secondMeetingsLast30Days: number;
  } | null;
}

export interface TeamHistoryMetric {
  month: string;
  newClients: number;
  totalAum: number;
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
 * Obtener dashboard del miembro (legacy? user MemberTeamDashboardData instead if applicable)
 */
async function getMemberDashboard(): Promise<ApiResponse<MemberDashboardResponse>> {
  return apiClient.get<MemberDashboardResponse>('/v1/teams/member-dashboard');
}

/**
 * Obtener equipo con miembros y métricas combinados
 */
interface TeamDetailResponse {
  team: Team;
  metrics: TeamMetrics;
}

export async function getTeamDetail(id: string): Promise<ApiResponse<TeamDetailResponse>> {
  return apiClient.get<TeamDetailResponse>(`/v1/teams/${id}/detail`, { cache: 'no-store' });
}

/**
 * Obtener miembro individual de un equipo
 */
export async function getTeamMemberById(
  teamId: string,
  memberId: string
): Promise<ApiResponse<TeamMember>> {
  return apiClient.get<TeamMember>(`/v1/teams/${teamId}/members/${memberId}`);
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
export async function inviteTeamMember(data: {
  teamId: string;
  userId?: string;
  email?: string;
}): Promise<ApiResponse<TeamInvitationResponse>> {
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

/**
 * Obtener resumen de actividad de todos los miembros del equipo
 */
export interface TeamMembersActivityResponse {
  members: TeamMemberActivity[];
  summary: {
    totalMembers: number;
    activeMembers: number;
    moderateMembers: number;
    inactiveMembers: number;
    criticalMembers: number;
    totalContactsCreatedThisMonth: number;
    totalFirstMeetingsLast30Days: number;
  };
}

export async function getTeamMembersActivity(
  teamId: string
): Promise<ApiResponse<TeamMembersActivityResponse>> {
  return apiClient.get<TeamMembersActivityResponse>(`/v1/teams/${teamId}/members-activity`);
}

/**
 * Obtener historial de métricas del equipo
 */
export async function getTeamHistory(teamId: string): Promise<ApiResponse<TeamHistoryMetric[]>> {
  return apiClient.get<TeamHistoryMetric[]>(`/v1/teams/${teamId}/history`);
}

// New API calls added in previous steps
async function getMemberTeamDashboard(): Promise<ApiResponse<MemberDashboardResponse>> {
  return apiClient.get<MemberDashboardResponse>('/v1/teams/my-dashboard', { cache: 'no-store' });
}

async function getTeamGoals(teamId: string): Promise<ApiResponse<TeamGoal[]>> {
  return apiClient.get<TeamGoal[]>(`/v1/teams/${teamId}/goals`, { cache: 'no-store' });
}

async function setTeamGoal(
  teamId: string,
  data: SetTeamGoalRequest
): Promise<ApiResponse<TeamGoal>> {
  return apiClient.post<TeamGoal>(`/v1/teams/${teamId}/goals`, data);
}

async function listStalledLeads(teamId: string): Promise<ApiResponse<StalledLead[]>> {
  return apiClient.get<StalledLead[]>(`/v1/teams/${teamId}/leads/stalled`, { cache: 'no-store' });
}

async function reassignTeamLeads(
  teamId: string,
  data: ReassignLeadsRequest
): Promise<ApiResponse<void>> {
  return apiClient.post<void>(`/v1/teams/${teamId}/leads/reassign`, data);
}

async function getTeamCapacity(teamId: string): Promise<ApiResponse<TeamCapacityMember[]>> {
  return apiClient.get<TeamCapacityMember[]>(`/v1/teams/${teamId}/capacity`, { cache: 'no-store' });
}
