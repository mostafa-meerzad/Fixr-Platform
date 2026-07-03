import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VerifyExpertDto } from './dto/verify-expert.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { JobStatus, UserRole, VerificationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboardMetrics() {
    const [
      totalUsers,
      activeUsers,
      verifiedExperts,
      openJobs,
      assignedJobs,
      completedJobs,
      cancelledJobs,
      disputedJobs,
      pendingVerifications,
      creditTransactionsThisMonth,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: UserRole.ADMIN } } }),
      this.prisma.user.count({ where: { isActive: true, isSuspended: false, role: { not: UserRole.ADMIN } } }),
      this.prisma.expertProfile.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      this.prisma.job.count({ where: { status: JobStatus.ASSIGNED } }),
      this.prisma.job.count({ where: { status: JobStatus.COMPLETED } }),
      this.prisma.job.count({ where: { status: JobStatus.CANCELLED } }),
      this.prisma.job.count({ where: { status: JobStatus.DISPUTED } }),
      this.prisma.expertProfile.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      this.prisma.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      experts: { verified: verifiedExperts, pendingVerification: pendingVerifications },
      jobs: {
        open: openJobs,
        assigned: assignedJobs,
        completed: completedJobs,
        cancelled: cancelledJobs,
        disputed: disputedJobs,
      },
      credits: {
        purchasedThisMonth: creditTransactionsThisMonth._sum.amount ?? 0,
      },
    };
  }

  // ─── Verification queue ───────────────────────────────────────────────────

  async getPendingVerifications() {
    return this.prisma.expertProfile.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: {
        user: { select: { id: true, name: true, phone: true, createdAt: true } },
        serviceZones: { include: { zone: true } },
        shopZone: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async verifyExpert(expertUserId: string, dto: VerifyExpertDto) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId: expertUserId },
    });
    if (!profile) throw new NotFoundException('Expert profile not found.');

    const updated = await this.prisma.expertProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: dto.status,
        verificationNote: dto.note,
      },
    });

    // Grant welcome credits on approval
    if (dto.status === VerificationStatus.VERIFIED) {
      await this.credits.grantWelcomeCredits(profile.id);
    }

    // Notify the expert
    const isApproved = dto.status === VerificationStatus.VERIFIED;
    await this.notifications.notifyUser(expertUserId, {
      type: isApproved ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
      title: isApproved ? 'حساب شما تأیید شد!' : 'تأیید حساب رد شد',
      titleEn: isApproved ? 'Account verified!' : 'Verification rejected',
      body: isApproved
        ? 'حساب شما تأیید شد. اکنون می‌توانید قیمت بدهید.'
        : dto.note ?? 'درخواست تأیید شما رد شد. لطفاً مجدداً اقدام کنید.',
      bodyEn: isApproved
        ? 'Your account is verified. You can now place bids.'
        : dto.note ?? 'Your verification was rejected. Please resubmit.',
      data: { status: dto.status },
    });

    return updated;
  }

  // ─── User management ──────────────────────────────────────────────────────

  async getUsers(role?: UserRole, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = role ? { role } : { role: { not: UserRole.ADMIN } };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          expertProfile: {
            select: {
              verificationStatus: true,
              rating: true,
              completedJobs: true,
              creditBalance: true,
            },
          },
          _count: { select: { jobsAsHomeowner: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        expertProfile: {
          include: {
            serviceZones: { include: { zone: true } },
            creditBalance: true,
          },
        },
        _count: { select: { jobsAsHomeowner: true } },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found.`);
    return user;
  }

  async setSuspension(userId: string, dto: SuspendUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found.`);

    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: dto.isSuspended },
    });
  }

  // ─── Expert stats adjustment (post-dispute) ───────────────────────────────

  async adjustExpertPoints(
    expertUserId: string,
    body: { positivePoints?: number; negativePoints?: number; noShowCount?: number },
  ) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId: expertUserId },
    });
    if (!profile) throw new NotFoundException('Expert profile not found.');

    return this.prisma.expertProfile.update({
      where: { id: profile.id },
      data: {
        ...(body.positivePoints !== undefined && { positivePoints: { increment: body.positivePoints } }),
        ...(body.negativePoints !== undefined && { negativePoints: { increment: body.negativePoints } }),
        ...(body.noShowCount !== undefined && { noShowCount: { increment: body.noShowCount } }),
      },
    });
  }

  // ─── Notifications broadcast ──────────────────────────────────────────────

  async getNotifications(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        include: { user: { select: { id: true, name: true } } },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
