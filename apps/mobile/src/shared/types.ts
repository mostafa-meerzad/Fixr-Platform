import {
  UserRole,
  JobStatus,
  Urgency,
  VerificationStatus,
  DisputeReason,
  CreditTransactionType,
  NotificationType,
} from './enums';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface ExpertProfile {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  shopName?: string;
  shopImageUrl?: string;
  rating: number;
  completedJobs: number;
  completionRate: number;
  noShowCount: number;
  positivePoints: number;
  negativePoints: number;
  verificationStatus: VerificationStatus;
  serviceZones: string[];
  isAvailable: boolean;
}

export interface JobSummary {
  id: string;
  title: string;
  status: JobStatus;
  urgency: Urgency;
  zoneName: string;
  categoryName: string;
  createdAt: string;
  bidCount: number;
}

export interface BidSummary {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  estimatedDurationHours: number;
  warrantyDescription?: string;
  expertMessage?: string;
  expert: Pick<ExpertProfile, 'id' | 'name' | 'avatarUrl' | 'rating' | 'completedJobs' | 'positivePoints' | 'negativePoints' | 'verificationStatus'>;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface DisputeDetail {
  id: string;
  jobId: string;
  reason: DisputeReason;
  description: string;
  reportedBy: UserSummary;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}
