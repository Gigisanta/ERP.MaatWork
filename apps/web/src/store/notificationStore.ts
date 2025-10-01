import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  leida: boolean;
  fechaCreacion: Date;
  usuarioId?: string;
}

interface NotificationState {
  notifications: Notificacion[];
  addNotification: (notification: Omit<Notificacion, 'id' | 'fechaCreacion' | 'leida'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(persist(
  (set, get) => ({
    notifications: [],
    
    addNotification: (notification) => {
      const nuevaNotificacion: Notificacion = {
        ...notification,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fechaCreacion: new Date(),
        leida: false
      };
      
      set((state) => ({
        notifications: [nuevaNotificacion, ...state.notifications]
      }));
    },
    
    markAsRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map(notification =>
          notification.id === id
            ? { ...notification, leida: true }
            : notification
        )
      }));
    },
    
    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map(notification => ({
          ...notification,
          leida: true
        }))
      }));
    },
    
    removeNotification: (id) => {
      set((state) => ({
        notifications: state.notifications.filter(notification => notification.id !== id)
      }));
    },
    
    clearNotifications: () => {
      set({ notifications: [] });
    },
    
    getUnreadCount: () => {
      return get().notifications.filter(notification => !notification.leida).length;
    }
  }),
  {
    name: 'notification-storage',
    version: 1
  }
));