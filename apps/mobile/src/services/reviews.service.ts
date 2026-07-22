import { api } from './api';

export const reviewsService = {
  submit: (jobId: string, data: ReviewPayload) =>
    api.post(`/jobs/${jobId}/review`, data),
  getForUser: (userId: string) =>
    api.get<Review[]>(`/users/${userId}/reviews`),
};

export interface ReviewPayload {
  rating: number;
  comment?: string;
  isPositive?: boolean;
  tags?: string[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  isPositive: boolean | null;
  createdAt: string;
  reviewer: {
    name: string;
    avatarUrl: string | null;
  };
  job?: {
    id: string;
    title: string;
    completedAt: string | null;
  } | null;
}
