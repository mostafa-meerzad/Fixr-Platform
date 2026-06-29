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

export type JobStatus =
  | 'DRAFT' | 'OPEN' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED'
  | 'IN_PROGRESS' | 'COMPLETION_REQUESTED' | 'COMPLETED'
  | 'CANCELLED' | 'DISPUTED';

export type JobUrgency = 'EMERGENCY' | 'TODAY' | 'SCHEDULED';

export interface Job {
  id: string;
  title: string;
  status: JobStatus;
  urgency: JobUrgency;
  address: string;
  description?: string;
  zone: { id: string; nameEn: string; name: string };
  category?: { id: string; nameEn: string; name: string };
  _count: { bids: number };
  createdAt: string;
  openedAt?: string;
  scheduledAt?: string;
}

export interface JobListResponse {
  data: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
