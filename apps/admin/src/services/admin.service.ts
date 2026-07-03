import { api } from '@/lib/api';
import type {
  DashboardStats, User, ExpertProfile, PendingExpert, Dispute,
  CreditTx, CreditRate, Zone, Category, Paginated,
} from '@/types';

// Dashboard
export const getDashboard = () =>
  api.get<DashboardStats>('/admin/dashboard').then((r) => r.data);

// Users
export const getUsers = (params: { role?: string; page?: number; limit?: number }) =>
  api.get<Paginated<User>>('/admin/users', { params }).then((r) => r.data);

export const getUser = (id: string) =>
  api.get<User>(`/admin/users/${id}`).then((r) => r.data);

export const suspendUser = (id: string, isSuspended: boolean, reason?: string) =>
  api.patch(`/admin/users/${id}/suspension`, { isSuspended, reason }).then((r) => r.data);

export const adjustExpertPoints = (id: string, data: { positivePoints?: number; negativePoints?: number; noShowCount?: number }) =>
  api.patch(`/admin/users/${id}/expert-points`, data).then((r) => r.data);

// Verification
export const getPendingVerifications = () =>
  api.get<PendingExpert[]>('/admin/verification/pending').then((r) => r.data);

export const setVerificationStatus = (userId: string, status: 'VERIFIED' | 'REJECTED', note?: string | null) =>
  api.post(`/admin/verification/${userId}`, { status, note }).then((r) => r.data);

// Disputes
export const getDisputes = (params?: { page?: number; limit?: number }) =>
  api.get<Paginated<Dispute>>('/disputes', { params }).then((r) => r.data);

export const getDispute = (id: string) =>
  api.get<Dispute>(`/disputes/${id}`).then((r) => r.data);

export const resolveDispute = (id: string, resolution: string) =>
  api.post(`/disputes/${id}/resolve`, { resolution }).then((r) => r.data);

// Credits
export const getCreditLedger = (expertUserId: string, params?: { page?: number; limit?: number }) =>
  api.get<Paginated<CreditTx>>(`/credits/admin/ledger/${expertUserId}`, { params }).then((r) => r.data);

export const purchaseCredits = (expertUserId: string, amount: number, note: string) =>
  api.post('/credits/admin/purchase', { expertUserId, amount, note }).then((r) => r.data);

export const adjustCredits = (expertUserId: string, amount: number, reason: string) =>
  api.post('/credits/admin/adjust', { expertUserId, amount, reason }).then((r) => r.data);

export const getCreditRate = () =>
  api.get<CreditRate>('/credits/admin/rate').then((r) => r.data);

export const updateCreditRate = (data: { afnPerCredit: number; welcomeCredits: number; welcomeExpiryDays: number }) =>
  api.put('/credits/admin/rate', data).then((r) => r.data);

// Zones
export const getZones = () =>
  api.get<Zone[]>('/zones').then((r) => r.data);

export const createZone = (data: { name: string; nameEn: string; latitude: number; longitude: number }) =>
  api.post('/zones', data).then((r) => r.data);

export const updateZone = (id: string, data: Partial<{ name: string; nameEn: string; latitude: number; longitude: number }>) =>
  api.patch(`/zones/${id}`, data).then((r) => r.data);

export const deleteZone = (id: string) =>
  api.delete(`/zones/${id}`).then((r) => r.data);

// Categories
export const getCategories = () =>
  api.get<Category[]>('/categories', { params: { all: true } }).then((r) => r.data);

export const createCategory = (data: { name: string; nameEn: string; icon: string }) =>
  api.post('/categories', data).then((r) => r.data);

export const updateCategory = (id: string, data: Partial<{ name: string; nameEn: string; icon: string; isActive: boolean }>) =>
  api.patch(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: string) =>
  api.delete(`/categories/${id}`).then((r) => r.data);

// Admin notification log
export const getAdminNotifications = (params?: { page?: number; limit?: number }) =>
  api.get('/admin/notifications', { params }).then((r) => r.data);
