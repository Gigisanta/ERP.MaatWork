import { apiClient } from './client';
import type {
  Feedback,
  FeedbackListResponse,
  CreateFeedbackRequest,
  UpdateFeedbackStatusRequest,
} from '@maatwork/types';

export type { Feedback, FeedbackListResponse, CreateFeedbackRequest, UpdateFeedbackStatusRequest };

export async function createFeedback(data: CreateFeedbackRequest) {
  return apiClient.post<Feedback>('/v1/feedback', data);
}

export async function updateFeedbackStatus(id: string, status: string, adminNotes?: string) {
  return apiClient.patch<Feedback>(`/v1/feedback/${id}`, { status, adminNotes });
}
