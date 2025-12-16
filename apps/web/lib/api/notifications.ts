import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import type { NotificationListResponse, UnreadCountResponse } from '@/types/notifications';

export const notificationKeys = {
  all: (limit: number = 20) => `/notifications?limit=${limit}`,
  unreadCount: '/notifications/unread/count',
};

export async function getNotifications(limit: number = 20, offset: number = 0) {
  return apiClient.get<NotificationListResponse>(`/notifications?limit=${limit}&offset=${offset}`);
}

export async function getUnreadCount() {
  return apiClient.get<UnreadCountResponse>('/notifications/unread/count');
}

export async function markAsRead(id: string) {
  return apiClient.post<{ success: true }>(`/notifications/${id}/read`, {});
}

export async function markAllAsRead() {
  return apiClient.post<{ success: true }>('/notifications/read-all', {});
}
