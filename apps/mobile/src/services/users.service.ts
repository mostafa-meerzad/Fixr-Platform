import { api } from './api';

export interface SubmitVerificationPayload {
  shopName?: string;
  description?: string;
  shopZoneId: string;
  shopAddress: string;
}

export interface ExpertProfile {
  id: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isAvailable: boolean;
  rating: number;
  completedJobs: number;
  totalJobs: number;
  completionRate: number;
  noShowCount: number;
  positivePoints: number;
  negativePoints: number;
  selfieUrl?: string | null;
  shopName?: string;
  description?: string;
  shopZoneId?: string;
  shopAddress?: string;
  shopZone?: { id: string; nameEn: string };
  creditBalance: { balance: number };
  serviceZones: { zone: { id: string; name: string; nameEn: string } }[];
  serviceCategories: { category: { id: string; nameEn: string } }[];
}

export interface HomeownerProfile {
  id: string;
  zoneId: string;
  address: string;
  zone: { id: string; nameEn: string };
  positivePoints: number;
  negativePoints: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: 'HOMEOWNER' | 'EXPERT';
  avatarUrl?: string | null;
  language?: string;
  expertProfile?: ExpertProfile;
  homeownerProfile?: HomeownerProfile;
}

export const usersService = {
  getMe: () => api.get<UserProfile>('/users/me'),
  updateMe: (data: { name?: string; language?: string }) =>
    api.patch('/users/me', data),
  submitVerification: (data: SubmitVerificationPayload) =>
    api.post('/users/me/submit-verification', data),
  updateZones: (zoneIds: string[]) =>
    api.patch('/users/me/zones', { zoneIds }),
  updateCategories: (categoryIds: string[]) =>
    api.patch('/users/me/categories', { categoryIds }),
  updateAvailability: (isAvailable: boolean) =>
    api.patch('/users/me/availability', { isAvailable }),
};
