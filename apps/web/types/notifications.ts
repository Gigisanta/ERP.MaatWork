export interface Notification {
  id: string;
  userId: string;
  type: string;
  templateId?: string | null;
  severity: 'info' | 'warning' | 'critical';
  contactId?: string | null;
  taskId?: string | null;
  payload: Record<string, unknown>;
  renderedSubject?: string | null;
  renderedBody: string;
  readAt?: string | null;
  createdAt: string;
  clickedAt?: string | null;
}

export interface NotificationListResponse {
  items: Notification[];
  meta: {
    limit: number;
    offset: number;
    total?: number;
  };
}

export interface UnreadCountResponse {
  count: number;
}








