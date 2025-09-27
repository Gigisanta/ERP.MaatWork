import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { User } from './teamStore';

export interface Approval {
  id: string;
  user_id: string;
  requested_role: 'manager' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  approver?: User;
}

interface ApprovalsState {
  approvals: Approval[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchApprovals: () => Promise<void>;
  createApproval: (userId: string, requestedRole: 'manager' | 'admin') => Promise<Approval | null>;
  updateApproval: (approvalId: string, status: 'approved' | 'rejected', comments?: string, approvedBy?: string) => Promise<void>;
  deleteApproval: (approvalId: string) => Promise<void>;
  getPendingApprovals: () => Approval[];
  getUserApprovals: (userId: string) => Approval[];
  clearError: () => void;
}

export const useApprovalsStore = create<ApprovalsState>((set, get) => ({
  approvals: [],
  loading: false,
  error: null,

  fetchApprovals: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          user:users!approvals_user_id_fkey(*),
          approver:users!approvals_approved_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ approvals: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createApproval: async (userId: string, requestedRole: 'manager' | 'admin') => {
    set({ loading: true, error: null });
    try {
      // Check if user already has a pending approval
      const { data: existingApproval } = await supabase
        .from('approvals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingApproval) {
        throw new Error('Ya existe una solicitud pendiente para este usuario');
      }

      const { data, error } = await supabase
        .from('approvals')
        .insert({
          user_id: userId,
          requested_role: requestedRole,
          status: 'pending'
        })
        .select(`
          *,
          user:users!approvals_user_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      const { approvals } = get();
      set({ approvals: [data, ...approvals], loading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  updateApproval: async (approvalId: string, status: 'approved' | 'rejected', comments?: string, approvedBy?: string) => {
    set({ loading: true, error: null });
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (comments) updateData.comments = comments;
      if (approvedBy) updateData.approved_by = approvedBy;

      const { error } = await supabase
        .from('approvals')
        .update(updateData)
        .eq('id', approvalId);

      if (error) throw error;

      // If approved, update user role
      if (status === 'approved') {
        const approval = get().approvals.find(a => a.id === approvalId);
        if (approval) {
          const { error: userError } = await supabase
            .from('users')
            .update({ 
              role: approval.requested_role,
              updated_at: new Date().toISOString()
            })
            .eq('id', approval.user_id);

          if (userError) throw userError;
        }
      }

      const { approvals } = get();
      set({
        approvals: approvals.map(approval => 
          approval.id === approvalId 
            ? { ...approval, status, comments: comments || approval.comments, approved_by: approvedBy || approval.approved_by }
            : approval
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteApproval: async (approvalId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('approvals')
        .delete()
        .eq('id', approvalId);

      if (error) throw error;

      const { approvals } = get();
      set({ 
        approvals: approvals.filter(approval => approval.id !== approvalId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  getPendingApprovals: () => {
    return get().approvals.filter(approval => approval.status === 'pending');
  },

  getUserApprovals: (userId: string) => {
    return get().approvals.filter(approval => approval.user_id === userId);
  },

  clearError: () => {
    set({ error: null });
  }
}));