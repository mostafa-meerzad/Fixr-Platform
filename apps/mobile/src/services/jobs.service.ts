import { api } from './api';

export const jobsService = {
  create: (data: CreateJobPayload) =>
    api.post('/jobs', data),

  update: (id: string, data: Partial<CreateJobPayload>) =>
    api.patch(`/jobs/${id}`, data),

  publish: (id: string) =>
    api.post(`/jobs/${id}/publish`),

  cancel: (id: string, reason: string) =>
    api.post(`/jobs/${id}/cancel`, { reason }),

  deleteDraft: (id: string) =>
    api.delete(`/jobs/${id}`),

  list: (params?: Record<string, string | number>) =>
    api.get('/jobs', { params }),

  browse: (params?: Record<string, string | number>) =>
    api.get('/jobs/browse', { params }),

  get: (id: string) =>
    api.get(`/jobs/${id}`),

  // State transitions
  markEnRoute:          (id: string) => api.post(`/jobs/${id}/en-route`),
  markArrived:          (id: string) => api.post(`/jobs/${id}/arrived`),
  markInProgress:       (id: string) => api.post(`/jobs/${id}/start`),
  requestCompletion:    (id: string) => api.post(`/jobs/${id}/request-completion`),
  confirmCompletion:    (id: string) => api.post(`/jobs/${id}/complete`),
};

export interface CreateJobPayload {
  title: string;
  description: string;
  categoryId: string;
  zoneId: string;
  address: string;
  urgency: 'EMERGENCY' | 'TODAY' | 'SCHEDULED';
  scheduledAt?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}
