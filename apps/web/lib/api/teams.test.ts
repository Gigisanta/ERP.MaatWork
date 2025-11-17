/**
 * Tests para teams API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './teams';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true }))
    }
  };
});

describe('teams api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get teams endpoint', async () => {
    await apiIndex.getTeams();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams');
  });

  it('calls get team by id endpoint', async () => {
    await apiIndex.getTeamById('team-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/team-123');
  });

  it('calls create team endpoint', async () => {
    const data = { name: 'Test Team', managerUserId: 'user-123' };
    await apiIndex.createTeam(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams', data);
  });

  it('calls update team endpoint', async () => {
    const data = { name: 'Updated Team' };
    await apiIndex.updateTeam('team-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/teams/team-123', data);
  });

  it('calls delete team endpoint', async () => {
    await apiIndex.deleteTeam('team-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/teams/team-123');
  });

  it('calls add team member endpoint', async () => {
    const data = { userId: 'user-456', role: 'member' };
    await apiIndex.addTeamMember('team-123', data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams/team-123/members', data);
  });

  it('calls remove team member endpoint', async () => {
    await apiIndex.removeTeamMember('team-123', 'member-456');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/teams/team-123/members/member-456');
  });

  it('calls get team advisors endpoint', async () => {
    await apiIndex.getTeamAdvisors('team-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/team-123/advisors');
  });

  it('calls get team members endpoint', async () => {
    await apiIndex.getTeamMembers('team-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/team-123/members');
  });

  it('calls create team invitation endpoint', async () => {
    const data = { userId: 'user-456' };
    await apiIndex.createTeamInvitation('team-123', data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams/team-123/invitations', data);
  });

  it('calls get membership requests endpoint', async () => {
    await apiIndex.getMembershipRequests();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/membership-requests');
  });

  it('calls respond to membership request endpoint', async () => {
    await apiIndex.respondToMembershipRequest('request-123', 'accept');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams/membership-requests/request-123/accept');
  });

  it('calls get pending invitations endpoint', async () => {
    await apiIndex.getPendingInvitations();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/invitations/pending');
  });

  it('calls respond to invitation endpoint', async () => {
    await apiIndex.respondToInvitation('invitation-123', 'reject');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams/invitations/invitation-123/reject');
  });

  it('calls invite team member endpoint', async () => {
    const data = { teamId: 'team-123', userId: 'user-456' };
    await apiIndex.inviteTeamMember(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/teams/invite-member', data);
  });

  it('calls get all team members endpoint', async () => {
    await apiIndex.getAllTeamMembers();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/members');
  });

  it('calls get team metrics endpoint', async () => {
    await apiIndex.getTeamMetrics('team-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/team-123/metrics');
  });

  it('calls get team member metrics endpoint', async () => {
    await apiIndex.getTeamMemberMetrics('team-123', 'member-456');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/teams/team-123/members/member-456/metrics');
  });
});

