import { create } from 'zustand';
import { supabase } from '@cactus/database';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  name?: string;
  username?: string;
  role: 'advisor' | 'manager' | 'admin';
  phone: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  manager_id: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  manager?: User;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'advisor' | 'manager';
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
  user?: User;
  team?: Team;
}

interface TeamState {
  teams: Team[];
  teamMembers: TeamMember[];
  currentTeam: Team | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTeams: () => Promise<void>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  createTeam: (name: string, managerId: string) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  addTeamMember: (teamId: string, userId: string, role: 'advisor' | 'manager') => Promise<void>;
  updateTeamMember: (memberId: string, updates: Partial<TeamMember>) => Promise<void>;
  removeTeamMember: (memberId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  getTeamAdvisors: (teamId: string) => any[];
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  teamMembers: [],
  currentTeam: null,
  loading: false,
  error: null,

  fetchTeams: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          manager:users!teams_manager_id_fkey(*)
        `);

      if (error) throw error;
      set({ teams: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchTeamMembers: async (teamId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users!team_members_user_id_fkey(*),
          team:teams!team_members_team_id_fkey(*)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      set({ teamMembers: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createTeam: async (name: string, managerId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          manager_id: managerId,
          settings: {}
        })
        .select()
        .single();

      if (error) throw error;
      
      const { teams } = get();
      set({ teams: [...teams, data], loading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  updateTeam: async (teamId: string, updates: Partial<Team>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (error) throw error;

      const { teams } = get();
      set({
        teams: teams.map(team => 
          team.id === teamId ? { ...team, ...updates } : team
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      const { teams } = get();
      set({ 
        teams: teams.filter(team => team.id !== teamId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addTeamMember: async (teamId: string, userId: string, role: 'advisor' | 'manager') => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role,
          status: 'active'
        })
        .select(`
          *,
          user:users!team_members_user_id_fkey(*),
          team:teams!team_members_team_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      const { teamMembers } = get();
      set({ teamMembers: [...teamMembers, data], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateTeamMember: async (memberId: string, updates: Partial<TeamMember>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      const { teamMembers } = get();
      set({
        teamMembers: teamMembers.map(member => 
          member.id === memberId ? { ...member, ...updates } : member
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  removeTeamMember: async (memberId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      const { teamMembers } = get();
      set({ 
        teamMembers: teamMembers.filter(member => member.id !== memberId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setCurrentTeam: (team: Team | null) => {
    set({ currentTeam: team });
  },

  clearError: () => {
    set({ error: null });
  },

  // Obtener miembros del equipo
  getTeamMembers: (teamId: string) => {
    const state = get();
    return state.teamMembers.filter(member => member.team_id === teamId);
  },

  // Obtener asesores del equipo del manager actual
  getTeamAdvisors: (teamId: string) => {
    const state = get();
    return state.teamMembers
      .filter(member => member.team_id === teamId && member.user?.role === 'advisor')
      .map(member => member.user)
      .filter(user => user !== null);
  }
}));