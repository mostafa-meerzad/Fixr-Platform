import { api } from '@/lib/api';
import type { AdminUser } from '@/types';

export async function adminLogin(email: string, password: string) {
  const res = await api.post<{ accessToken: string; user: AdminUser }>('/auth/admin/login', { email, password });
  return res.data;
}
