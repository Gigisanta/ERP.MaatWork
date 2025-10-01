import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';
import { useNotificationStore } from './notificationStore';

let approvalsChannel: ReturnType<typeof supabase.channel> | undefined;

export interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: 'manager' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  priority?: 'high' | 'medium' | 'low';
  request_type?: 'role_upgrade' | 'new_registration';
  comments?: string;
  justification?: string;
  requested_at: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  // Información del usuario para mostrar en la UI
  user_name?: string;
  user_email?: string;
  user_department?: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
}

interface ApprovalState {
  approvalRequests: ApprovalRequest[];
  isLoading: boolean;
  stats: ApprovalStats;
  
  // Actions
  fetchApprovalRequests: () => Promise<void>;
  createApprovalRequest: (userId: string, requestedRole: 'manager' | 'admin', comments?: string) => Promise<ApprovalRequest>;
  approveRequest: (approvalId: string, comments?: string) => Promise<void>;
  rejectRequest: (approvalId: string, reason: string) => Promise<void>;
  getPendingRequests: () => ApprovalRequest[];
  getRequestsByStatus: (status: 'pending' | 'approved' | 'rejected') => ApprovalRequest[];
  getUserApprovalStatus: (userId: string) => ApprovalRequest | null;
  calculateStats: () => void;
  deleteRequest: (approvalId: string) => Promise<void>;
  startApprovalsSubscription: () => Promise<void>;
  stopApprovalsSubscription: () => Promise<void>;
}

// Mock data para desarrollo
const mockApprovalRequests: ApprovalRequest[] = [
  {
    id: 'approval-1',
    user_id: 'user-1',
    requested_role: 'manager',
    status: 'pending',
    priority: 'high',
    request_type: 'role_upgrade',
    comments: 'Tengo 3 años de experiencia liderando equipos y me gustaría asumir más responsabilidades.',
    justification: 'Tengo 3 años de experiencia liderando equipos y me gustaría asumir más responsabilidades.',
    requested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días atrás
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_name: 'Juan Pérez',
    user_email: 'juan.perez@email.com',
    user_department: 'Ventas'
  },
  {
    id: 'approval-2',
    user_id: 'user-2',
    requested_role: 'manager',
    status: 'approved',
    priority: 'medium',
    request_type: 'new_registration',
    comments: 'Solicito promoción a manager para liderar el equipo de marketing digital.',
    justification: 'Solicito promoción a manager para liderar el equipo de marketing digital.',
    requested_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días atrás
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Aprobado hace 3 días
    reviewed_by: 'admin-1',
    user_name: 'María García',
    user_email: 'maria.garcia@email.com',
    user_department: 'Marketing'
  },
  {
    id: 'approval-3',
    user_id: 'user-3',
    requested_role: 'manager',
    status: 'rejected',
    priority: 'low',
    request_type: 'role_upgrade',
    comments: 'Quiero ser manager del equipo de soporte técnico.',
    justification: 'Quiero ser manager del equipo de soporte técnico.',
    requested_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días atrás
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // Rechazado hace 4 días
    reviewed_by: 'admin-1',
    rejection_reason: 'Necesita más experiencia en liderazgo de equipos',
    user_name: 'Carlos López',
    user_email: 'carlos.lopez@email.com',
    user_department: 'Soporte'
  }
];

export const useApprovalStore = create<ApprovalState>()(
  persist(
    (set, get) => ({
      approvalRequests: mockApprovalRequests,
      isLoading: false,
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        thisMonth: 0
      },

      fetchApprovalRequests: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('approvals')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          set({ approvalRequests: (data as any) || [], isLoading: false });
          get().calculateStats();
        } catch (error) {
          console.error('Error fetching approval requests:', error);
          set({ isLoading: false });
        }
      },

      createApprovalRequest: async (userId: string, requestedRole: 'manager' | 'admin', comments?: string) => {
        const approvalRequest: ApprovalRequest = {
          id: crypto.randomUUID(),
          user_id: userId,
          requested_role: requestedRole,
          status: 'pending',
          comments,
          justification: comments,
          requested_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        try {
          // En una implementación real con Supabase:
          // const { data, error } = await supabase
          //   .from('approval_requests')
          //   .insert([approvalRequest])
          //   .select()
          //   .single();
          
          const { approvalRequests } = get();
          
          set({ 
            approvalRequests: [approvalRequest, ...approvalRequests]
          });
          
          // Crear notificación para administradores
          const notificationStore = useNotificationStore.getState();
          await notificationStore.createNotification({
            user_id: 'admin', // Se enviará a todos los admins
            type: 'approval_request',
            title: 'Nueva solicitud de aprobación',
            message: `Solicitud para ser ${requestedRole === 'manager' ? 'Manager' : 'Administrador'}`,
            data: { approval_id: approvalRequest.id, user_id: userId },
            priority: 'high'
          });
          
          // Recalcular estadísticas
          get().calculateStats();
          
          return approvalRequest;
        } catch (error) {
          console.error('Error creating approval request:', error);
          throw error;
        }
      },

      approveRequest: async (approvalId: string, comments?: string) => {
        try {
          const { approvalRequests } = get();
          const request = approvalRequests.find(r => r.id === approvalId);
          
          if (!request) {
            throw new Error('Solicitud de aprobación no encontrada');
          }
          
          const reviewedAt = new Date().toISOString();
          
          // En una implementación real con Supabase:
          // const { error } = await supabase
          //   .from('approval_requests')
          //   .update({
          //     status: 'approved',
          //     reviewed_at: reviewedAt,
          //     reviewed_by: currentUserId,
          //     comments
          //   })
          //   .eq('id', approvalId);
          
          // También actualizar el rol del usuario en el authStore
          const { useAuthStore } = await import('../store/authStore');
          const authStore = useAuthStore.getState();
          await authStore.updateUserRole(request.user_id, request.requested_role, 'current-admin-id');
          
          // Actualizar estado local
          const updatedRequests = approvalRequests.map(r => 
            r.id === approvalId 
              ? { 
                  ...r, 
                  status: 'approved' as const,
                  reviewed_at: reviewedAt,
                  reviewed_by: 'current-admin-id', // En implementación real, usar ID del admin actual
                  comments
                }
              : r
          );
          
          set({ approvalRequests: updatedRequests });
          
          // Crear notificación para el usuario
          const notificationStore = useNotificationStore.getState();
          await notificationStore.createNotification({
            user_id: request.user_id,
            type: 'approval_approved',
            title: 'Solicitud aprobada',
            message: `Tu solicitud para ser ${request.requested_role === 'manager' ? 'Manager' : 'Administrador'} ha sido aprobada`,
            priority: 'high'
          });
          
          // Recalcular estadísticas
          get().calculateStats();
        } catch (error) {
          console.error('Error approving request:', error);
          throw error;
        }
      },

      rejectRequest: async (approvalId: string, reason: string) => {
        try {
          const { approvalRequests } = get();
          const request = approvalRequests.find(r => r.id === approvalId);
          
          if (!request) {
            throw new Error('Solicitud de aprobación no encontrada');
          }
          
          const reviewedAt = new Date().toISOString();
          
          // En una implementación real con Supabase:
          // const { error } = await supabase
          //   .from('approval_requests')
          //   .update({
          //     status: 'rejected',
          //     reviewed_at: reviewedAt,
          //     reviewed_by: currentUserId,
          //     rejection_reason: reason
          //   })
          //   .eq('id', approvalId);
          
          // Actualizar estado local
          const updatedRequests = approvalRequests.map(r => 
            r.id === approvalId 
              ? { 
                  ...r, 
                  status: 'rejected' as const,
                  reviewed_at: reviewedAt,
                  reviewed_by: 'current-admin-id', // En implementación real, usar ID del admin actual
                  rejection_reason: reason
                }
              : r
          );
          
          set({ approvalRequests: updatedRequests });
          
          // Crear notificación para el usuario
          const notificationStore = useNotificationStore.getState();
          await notificationStore.createNotification({
            user_id: request.user_id,
            type: 'approval_rejected',
            title: 'Solicitud rechazada',
            message: `Tu solicitud para ser ${request.requested_role === 'manager' ? 'Manager' : 'Administrador'} ha sido rechazada: ${reason}`,
            priority: 'medium'
          });
          
          // Recalcular estadísticas
          get().calculateStats();
        } catch (error) {
          console.error('Error rejecting request:', error);
          throw error;
        }
      },

      getPendingRequests: () => {
        const { approvalRequests } = get();
        return approvalRequests.filter(r => r.status === 'pending');
      },

      getRequestsByStatus: (status: 'pending' | 'approved' | 'rejected') => {
        const { approvalRequests } = get();
        return approvalRequests.filter(r => r.status === status);
      },

      getUserApprovalStatus: (userId: string) => {
        const { approvalRequests } = get();
        // Buscar la solicitud más reciente del usuario
        return approvalRequests
          .filter(r => r.user_id === userId)
          .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())[0] || null;
      },

      calculateStats: () => {
        const { approvalRequests } = get();
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats: ApprovalStats = {
          total: approvalRequests.length,
          pending: approvalRequests.filter(r => r.status === 'pending').length,
          approved: approvalRequests.filter(r => r.status === 'approved').length,
          rejected: approvalRequests.filter(r => r.status === 'rejected').length,
          thisMonth: approvalRequests.filter(r => 
            new Date(r.requested_at) >= thisMonth
          ).length
        };
        
        set({ stats });
      },

      deleteRequest: async (approvalId: string) => {
        try {
          const { error } = await supabase
            .from('approvals')
            .delete()
            .eq('id', approvalId);
          if (error) throw error;
          await get().fetchApprovalRequests();
        } catch (error) {
          console.error('Error deleting approval request:', error);
          throw error;
        }
      },
      startApprovalsSubscription: async () => {
        if (approvalsChannel) return;
        approvalsChannel = supabase
          .channel('approvals-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => {
            get().fetchApprovalRequests();
          })
          .subscribe();
      },
      stopApprovalsSubscription: async () => {
        if (approvalsChannel) {
          await supabase.removeChannel(approvalsChannel);
          approvalsChannel = undefined;
        }
      }
    }),
    {
      name: 'approval-store',
      partialize: (state) => ({
        approvalRequests: state.approvalRequests,
        stats: state.stats
      })
    }
  )
);

// Hooks personalizados
export const usePendingApprovals = () => {
  const getPendingRequests = useApprovalStore(state => state.getPendingRequests);
  return getPendingRequests();
};

export const useApprovalStats = () => {
  return useApprovalStore(state => state.stats);
};

export const useUserApprovalStatus = (userId: string) => {
  const getUserApprovalStatus = useApprovalStore(state => state.getUserApprovalStatus);
  return getUserApprovalStatus(userId);
};