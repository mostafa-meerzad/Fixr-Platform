import { UserRole } from '@/shared';
import { api } from './api';

export const authService = {
  sendOtp: (phone: string) =>
    api.post<{ message: string }>('/auth/otp/send', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post<{ sessionId: string; isNewUser: boolean }>('/auth/otp/verify', { phone, code }),

  login: (phone: string, sessionId: string) =>
    api.post<AuthResponse>('/auth/login', { phone, sessionId }),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    avatarUrl?: string;
  };
}

export interface RegisterPayload {
  phone: string;
  name: string;
  role: 'HOMEOWNER' | 'EXPERT';
  sessionId: string;
  zoneId?: string;   // required when role = HOMEOWNER
  address?: string;  // required when role = HOMEOWNER
}
