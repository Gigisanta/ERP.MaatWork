import type { TimestampedEntity, PaginatedResponse } from './common';

export type FeedbackType = 'feedback' | 'feature_request' | 'bug';
export type FeedbackStatus = 'new' | 'in_progress' | 'completed' | 'closed';

export interface Feedback extends TimestampedEntity {
  id: string;
  userId: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  adminNotes: string | null;
}

export interface FeedbackListResponse {
  items: Feedback[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateFeedbackRequest {
  type: FeedbackType;
  content: string;
}

export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
  adminNotes?: string;
}
