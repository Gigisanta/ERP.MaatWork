import { create } from 'zustand';
import { supabase } from '@cactus/database';
import { User } from './teamStore';

export interface ApprovalRequest {
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
  // Campos opcionales para UI
  request_type?: 'role_upgrade' | 'new_registration';
  priority?: 'high' | 'medium' | 'low';
  justification?: string;
}

interface ApprovalState {
  approvalRequests: ApprovalRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchApprovalRequests: () => Promise<void>;
  createApprovalRequest: (userId: string, requestedRole: 'manager' | 'admin') => Promise<ApprovalRequest | null>;
  approveRequest: (approvalId: string, comments?: string) => Promise<void>;
  rejectRequest: (approvalId: string, reason?: string) => Promise<void>;
  deleteRequest: (approvalId: string) => Promise<void>;
  getPendingRequests: () => ApprovalRequest[];
  getUserApprovalStatus: (userId: string) => ApprovalRequest | null;
  clearError: () => void;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvalRequests: [],
  isLoading: false,
  error: null,

  fetchApprovalRequests: async () => {
    set({ isLoading: true, error: null });
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
      set({ approvalRequests: data || [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createApprovalRequest: async (userId: string, requestedRole: 'manager' | 'admin') => {
    set({ isLoading: true, error: null });
    try {
      // Verificar si ya existe una solicitud pendiente
      const { data: existingApproval } = await supabase
        .from('approvals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

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

      const { approvalRequests } = get();
      set({ approvalRequests: [data, ...approvalRequests], isLoading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  approveRequest: async (approvalId: string, comments?: string) => {
    set({ isLoading: true, error: null });
    try {
      const updateData: any = {
        status: 'approved',
        updated_at: new Date().toISOString()
      };

      if (comments) updateData.comments = comments;

      const { error } = await supabase
        .from('approvals')
        .update(updateData)
        .eq('id', approvalId);

      if (error) throw error;

      // Actualizar el rol del usuario
      const approval = get().approvalRequests.find(a => a.id === approvalId);
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

      const { approvalRequests } = get();
      set({
        approvalRequests: approvalRequests.map(req => 
          req.id === approvalId 
            ? { ...req, status: 'approved', comments: comments || req.comments }
            : req
        ),
        isLoading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  rejectRequest: async (approvalId: string, reason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('approvals')
        .update({
          status: 'rejected',
          comments: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (error) throw error;

      const { approvalRequests } = get();
      set({
        approvalRequests: approvalRequests.map(req => 
          req.id === approvalId 
            ? { ...req, status: 'rejected', comments: reason || req.comments }
            : req
        ),
        isLoading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteRequest: async (approvalId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('approvals')
        .delete()
        .eq('id', approvalId);

      if (error) throw error;

      const { approvalRequests } = get();
      set({ 
        approvalRequests: approvalRequests.filter(req => req.id !== approvalId),
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getPendingRequests: () => {
    return get().approvalRequests.filter(req => req.status === 'pending');
  },

  getUserApprovalStatus: (userId: string) => {
    return get().approvalRequests.find(req => req.user_id === userId && req.status === 'pending') || null;
  },

  clearError: () => {
    set({ error: null });
  }
}));
