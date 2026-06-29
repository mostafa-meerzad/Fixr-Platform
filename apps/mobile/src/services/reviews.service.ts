import { api } from './api';

export const reviewsService = {
  submit: (jobId: string, data: ReviewPayload) =>
    api.post(`/jobs/${jobId}/review`, data),
};

export interface ReviewPayload {
  rating: number;
  comment?: string;
  isPositive?: boolean;
  tags?: string[];
}
