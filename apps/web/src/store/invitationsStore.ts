import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { User, Team } from './teamStore';
import { useAuthStore } from './authStore';

export interface Invitation {
  id: string;
  team_id: string;
  invited_by: string;
  email: string;
  role: 'advisor' | 'manager';
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  invitation_code: string;
  expires_at: string;
  expiresAt: string; // Alias for expires_at
  created_at: string;
  sentAt: string; // Alias for created_at
  message?: string; // Optional message property
  team?: Team;
  inviter?: User;
}

interface InvitationsState {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInvitations: (teamId?: string) => Promise<void>;
  createInvitation: (teamId: string, email: string, role: 'advisor' | 'manager', invitedBy: string, message?: string) => Promise<Invitation | null>;
  sendInvitation: (params: { email: string; role: 'advisor' | 'manager'; message?: string }) => Promise<void>;
  updateInvitation: (invitationId: string, status: 'accepted' | 'rejected') => Promise<void>;
  deleteInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  acceptInvitation: (invitationCode: string, userId: string) => Promise<boolean>;
  getPendingInvitations: () => Invitation[];
  getTeamInvitations: (teamId: string) => Invitation[];
  clearError: () => void;
}

export const useInvitationsStore = create<InvitationsState>((set, get) => ({
  invitations: [],
  loading: false,
  error: null,

  fetchInvitations: async (teamId?: string) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('invitations')
        .select(`
          *,
          team:teams!invitations_team_id_fkey(*),
          inviter:users!invitations_invited_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map database fields to component-expected properties
      const mappedInvitations = (data || []).map(invitation => ({
        ...invitation,
        sentAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        message: invitation.message || ''
      }));
      
      set({ invitations: mappedInvitations, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createInvitation: async (teamId: string, email: string, role: 'advisor' | 'manager', invitedBy: string, message?: string) => {
    set({ loading: true, error: null });
    try {
      // Check if there's already a pending invitation for this email and team
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('team_id', teamId)
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        throw new Error('Ya existe una invitación pendiente para este email en este equipo');
      }

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          team_id: teamId,
          invited_by: invitedBy,
          email,
          role,
          status: 'pending',
          message: message || ''
        })
        .select(`
          *,
          team:teams!invitations_team_id_fkey(*),
          inviter:users!invitations_invited_by_fkey(*)
        `)
        .single();

      if (error) throw error;

      // Map database fields to component-expected properties
      const mappedInvitation = {
        ...data,
        sentAt: data.created_at,
        expiresAt: data.expires_at,
        message: data.message || ''
      };

      const { invitations } = get();
      set({ invitations: [mappedInvitation, ...invitations], loading: false });
      return mappedInvitation;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  sendInvitation: async (params: { email: string; role: 'advisor' | 'manager'; message?: string }) => {
    // This is a wrapper around createInvitation for the component interface
    // We need to get the current user's team and user ID
    const { user } = useAuthStore.getState();
    if (!user?.team_id || !user?.id) {
      throw new Error('Usuario no autenticado o sin equipo asignado');
    }
    
    const store = get();
    await store.createInvitation(user.team_id, params.email, params.role, user.id, params.message);
  },

  cancelInvitation: async (invitationId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      const { invitations } = get();
      set({
        invitations: invitations.map(invitation => 
          invitation.id === invitationId 
            ? { ...invitation, status: 'cancelled' as const }
            : invitation
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateInvitation: async (invitationId: string, status: 'accepted' | 'rejected') => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitationId);

      if (error) throw error;

      const { invitations } = get();
      set({
        invitations: invitations.map(invitation => 
          invitation.id === invitationId 
            ? { ...invitation, status }
            : invitation
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteInvitation: async (invitationId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      const { invitations } = get();
      set({ 
        invitations: invitations.filter(invitation => invitation.id !== invitationId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  resendInvitation: async (invitationId: string) => {
    set({ loading: true, error: null });
    try {
      // Generate new invitation code and extend expiry
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);

      const { error } = await supabase
        .from('invitations')
        .update({ 
          expires_at: newExpiryDate.toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId);

      if (error) throw error;

      const { invitations } = get();
      set({
        invitations: invitations.map(invitation => 
          invitation.id === invitationId 
            ? { 
                ...invitation, 
                expires_at: newExpiryDate.toISOString(), 
                expiresAt: newExpiryDate.toISOString(),
                status: 'pending' as const 
              }
            : invitation
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  acceptInvitation: async (invitationCode: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      // Find the invitation by code
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        throw new Error('Invitación no válida o expirada');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        throw new Error('La invitación ha expirado');
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: userId,
          role: invitation.role,
          status: 'active'
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      const { invitations } = get();
      set({
        invitations: invitations.map(inv => 
          inv.id === invitation.id 
            ? { ...inv, status: 'accepted' as const }
            : inv
        ),
        loading: false
      });

      return true;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return false;
    }
  },

  getPendingInvitations: () => {
    return get().invitations.filter(invitation => invitation.status === 'pending');
  },

  getTeamInvitations: (teamId: string) => {
    return get().invitations.filter(invitation => invitation.team_id === teamId);
  },

  clearError: () => {
    set({ error: null });
  }
}));