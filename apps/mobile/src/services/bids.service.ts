import { api } from './api';

export const bidsService = {
  place: (jobId: string, data: PlaceBidPayload) =>
    api.post(`/jobs/${jobId}/bids`, data),

  update: (bidId: string, data: Partial<PlaceBidPayload>) =>
    api.patch(`/bids/${bidId}`, data),

  withdraw: (bidId: string) =>
    api.delete(`/bids/${bidId}`),

  accept: (jobId: string, bidId: string) =>
    api.post(`/jobs/${jobId}/bids/${bidId}/accept`),

  listForJob: (jobId: string) =>
    api.get(`/jobs/${jobId}/bids`),

  mine: () =>
    api.get('/bids/mine'),
};

export interface PlaceBidPayload {
  price: number;
  estimatedArrivalMinutes: number;
  estimatedDurationHours: number;
  warrantyDescription?: string;
  expertMessage?: string;
}
