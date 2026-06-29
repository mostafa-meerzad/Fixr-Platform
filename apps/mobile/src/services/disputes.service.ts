import { api } from './api';

export const disputesService = {
  submit: (jobId: string, data: { reason: string; description: string }) =>
    api.post(`/jobs/${jobId}/dispute`, data),
};
