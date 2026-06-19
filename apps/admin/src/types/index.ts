export type Role = 'HOMEOWNER' | 'EXPERT' | 'ADMIN';
export type JobStatus =
  | 'DRAFT' | 'OPEN' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED'
  | 'IN_PROGRESS' | 'COMPLETION_REQUESTED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DisputeReason = 'NO_SHOW' | 'PRICE_DISPUTE' | 'WORK_QUALITY' | 'COMMUNICATION_ISSUE' | 'OTHER';
export type CreditTxType = 'WELCOME_GRANT' | 'PURCHASE' | 'BID_SPEND' | 'BID_REFUND' | 'ADMIN_ADJUSTMENT';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  avatarUrl: string | null;
  isSuspended: boolean;
  createdAt: string;
  expertProfile?: ExpertProfile;
  _count?: { jobs: number };
}

export interface ExpertProfile {
  id: string;
  verificationStatus: VerificationStatus;
  isAvailable: boolean;
  rating: number;
  completedJobs: number;
  totalJobs: number;
  completionRate: number;
  noShowCount: number;
  positivePoints: number;
  negativePoints: number;
  creditBalance?: { balance: number };
  serviceZones?: Zone[];
  selfieUrl?: string | null;
  tazkiraFrontUrl?: string | null;
  tazkiraBackUrl?: string | null;
  shopImageUrl?: string | null;
  workLicenseUrl?: string | null;
}

export interface Zone {
  id: string;
  name: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  createdAt: string;
  updatedAt: string;
  homeowner?: User;
  expert?: User;
  zone?: Zone;
  category?: Category;
}

export interface Dispute {
  id: string;
  reason: DisputeReason;
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  job?: Job;
  raisedBy?: User;
}

export interface CreditTx {
  id: string;
  type: CreditTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface CreditRate {
  id: string;
  afnPerCredit: number;
  welcomeCredits: number;
  welcomeExpiryDays: number;
}

export interface DashboardStats {
  users: { total: number; active: number };
  experts: { verified: number; pendingVerification: number };
  jobs: { open: number; assigned: number; completed: number; cancelled: number; disputed: number };
  credits: { purchasedThisMonth: number };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
