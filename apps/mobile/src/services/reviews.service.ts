import { api } from './api';

export const reviewsService = {
  submit: (jobId: string, data: ReviewPayload) =>
    api.post(`/jobs/${jobId}/reviews`, data),
};

export interface ReviewPayload {
  rating: number;
  comment?: string;
  positivePoints?: string[];
  negativePoints?: string[];
}
