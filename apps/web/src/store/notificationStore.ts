import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@cactus/database';

export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_approved' | 'approval_rejected' | 'system' | 'task_assigned' | 'task_completed' | 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  read_at?: string;
}

export interface NotificationFilter {
  type?: string;
  priority?: string;
  unreadOnly?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  filter: NotificationFilter;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<Notification>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  setFilter: (filter: NotificationFilter) => void;
  getFilteredNotifications: () => Notification[];
  subscribeToNotifications: (userId: string) => () => void;
}

// Mock notifications for development
const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: 'admin',
    type: 'approval_request',
    title: 'Nueva solicitud de aprobación',
    message: 'Juan Pérez ha solicitado ser promovido a Manager',
    data: { approval_id: 'approval-1', user_id: 'user-1' },
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    type: 'approval_approved',
    title: 'Solicitud aprobada',
    message: 'Tu solicitud para ser Manager ha sido aprobada',
    priority: 'high',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    user_id: 'admin',
    type: 'system',
    title: 'Actualización del sistema',
    message: 'El sistema se actualizará esta noche a las 2:00 AM',
    priority: 'medium',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.read_at).length,
      isLoading: false,
      filter: {},

      fetchNotifications: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { notifications } = get();
          const unreadCount = notifications.filter(n => !n.read_at).length;
          set({ notifications, unreadCount, isLoading: false });
        } catch (error) {
          console.error('Error fetching notifications:', error);
          set({ isLoading: false });
        }
      },

      createNotification: async (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        try {
          const { notifications, unreadCount } = get();
          set({ notifications: [notification, ...notifications], unreadCount: unreadCount + 1 });
          return notification;
        } catch (error) {
          console.error('Error creating notification:', error);
          throw error;
        }
      },

      markAsRead: async (notificationId: string) => {
        try {
          const readAt = new Date().toISOString();
          const { notifications, unreadCount } = get();
          const updatedNotifications = notifications.map(n => n.id === notificationId ? { ...n, read_at: readAt } : n);
          const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
          set({ notifications: updatedNotifications, unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount });
        } catch (error) {
          console.error('Error marking notification as read:', error);
          throw error;
        }
      },

      markAllAsRead: async () => {
        try {
          const readAt = new Date().toISOString();
          const { notifications } = get();
          const updatedNotifications = notifications.map(n => ({ ...n, read_at: n.read_at || readAt }));
          set({ notifications: updatedNotifications, unreadCount: 0 });
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
          throw error;
        }
      },

      deleteNotification: async (notificationId: string) => {
        try {
          const { notifications, unreadCount } = get();
          const notificationToDelete = notifications.find(n => n.id === notificationId);
          const updatedNotifications = notifications.filter(n => n.id !== notificationId);
          set({ notifications: updatedNotifications, unreadCount: notificationToDelete && !notificationToDelete.read_at ? Math.max(0, unreadCount - 1) : unreadCount });
        } catch (error) {
          console.error('Error deleting notification:', error);
          throw error;
        }
      },

      clearAllNotifications: async () => {
        try {
          set({ notifications: [], unreadCount: 0 });
        } catch (error) {
          console.error('Error clearing all notifications:', error);
          throw error;
        }
      },

      setFilter: (filter: NotificationFilter) => {
        set({ filter });
      },

      getFilteredNotifications: () => {
        const { notifications, filter } = get();
        return notifications.filter(notification => {
          if (filter.type && notification.type !== filter.type) return false;
          if (filter.priority && notification.priority !== filter.priority) return false;
          if (filter.unreadOnly && notification.read_at) return false;
          return true;
        });
      },

      subscribeToNotifications: (_userId: string) => {
        return () => {};
      }
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount, filter: state.filter })
    }
  )
);

export const useFilteredNotifications = () => {
  const getFilteredNotifications = useNotificationStore(state => state.getFilteredNotifications);
  return getFilteredNotifications();
};

export const useUnreadCount = () => {
  return useNotificationStore(state => state.unreadCount);
};
