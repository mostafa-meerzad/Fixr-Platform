import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreditsService } from '../credits/credits.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { assertTransitionAllowed, getTimestampUpdate } from './job-state-machine';
import { JobStatus, Urgency, UserRole, User } from '@prisma/client';

const JOB_INCLUDE = {
  category: true,
  zone: true,
  media: true,
  acceptedBid: {
    include: {
      expert: {
        include: { user: true },
      },
    },
  },
  _count: { select: { bids: { where: { isWithdrawn: false } } } },
} as const;

// Used only for GET /jobs/browse — adds homeowner trust block without exposing phone
const BROWSE_JOB_INCLUDE = {
  ...JOB_INCLUDE,
  homeowner: {
    select: {
      id: true,
      name: true,
      homeownerProfile: { select: { positivePoints: true } },
      _count: { select: { jobsAsHomeowner: true } },
    },
  },
} as const;

// Statuses where the assigned expert may see the homeowner's phone number
const PHONE_VISIBLE_STATUSES: JobStatus[] = [
  JobStatus.ASSIGNED,
  JobStatus.EN_ROUTE,
  JobStatus.ARRIVED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETION_REQUESTED,
  JobStatus.COMPLETED,
];

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly credits: CreditsService,
  ) {}

  async create(homeowner: User, dto: CreateJobDto) {
    await this.validateCategoryAndZone(dto.categoryId, dto.zoneId);

    if (dto.urgency === Urgency.SCHEDULED && !dto.scheduledAt) {
      throw new BadRequestException('scheduledAt is required for SCHEDULED urgency.');
    }

    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        notes: dto.notes,
        urgency: dto.urgency,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        latitude: dto.latitude,
        longitude: dto.longitude,
        homeownerId: homeowner.id,
        categoryId: dto.categoryId,
        zoneId: dto.zoneId,
        status: JobStatus.DRAFT,
      },
      include: JOB_INCLUDE,
    });
  }

  async update(jobId: string, homeowner: User, dto: UpdateJobDto) {
    const job = await this.findOneOrFail(jobId);
    this.assertOwner(job, homeowner.id);

    if (job.status !== JobStatus.DRAFT) {
      throw new ForbiddenException('Only draft jobs can be edited.');
    }

    if (dto.categoryId) await this.validateCategoryAndZone(dto.categoryId, job.zoneId);
    if (dto.zoneId) await this.validateCategoryAndZone(job.categoryId, dto.zoneId);

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: JOB_INCLUDE,
    });
  }

  async publish(jobId: string, homeowner: User) {
    const job = await this.findOneOrFail(jobId);
    this.assertOwner(job, homeowner.id);
    assertTransitionAllowed(job.status, JobStatus.OPEN, UserRole.HOMEOWNER);

    // Must have at least one media item OR a description of ≥ 50 chars
    const hasMedia = await this.prisma.jobMedia.count({ where: { jobId } });
    if (hasMedia === 0 && job.description.length < 50) {
      throw new BadRequestException(
        'Job must have at least one photo or a detailed description (50+ chars) before publishing.',
      );
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.OPEN, openedAt: new Date() },
      include: { ...JOB_INCLUDE, zone: true },
    });

    // Notify verified, available experts who serve this zone and match the job's category
    await this.notifications.notifyExpertsInZone(
      updated.zoneId,
      {
        type: 'JOB_POSTED',
        title: 'کار جدید در منطقه شما',
        titleEn: 'New job in your zone',
        body: updated.title,
        data: { jobId: updated.id, urgency: updated.urgency },
      },
      updated.categoryId,
    );

    return updated;
  }

  async findAll(actor: User, query: QueryJobsDto) {
    const { page = 1, limit = 20, status, urgency, categoryId, zoneId } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(actor, { status, urgency, categoryId, zoneId });

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: JOB_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(jobId: string, actor: User) {
    const job = await this.findOneOrFail(jobId);
    this.assertViewAccess(job, actor);
    return this.redactHomeownerPhone(job, actor);
  }

  async transition(jobId: string, actor: User, targetStatus: JobStatus) {
    const job = await this.findOneOrFail(jobId);

    this.assertParticipant(job, actor);
    assertTransitionAllowed(job.status, targetStatus, actor.role);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: targetStatus,
        ...getTimestampUpdate(targetStatus),
      },
      include: JOB_INCLUDE,
    });

    await this.sendTransitionNotification(updated, actor, targetStatus);

    // When a job completes, update stats and prompt both parties to leave a review
    if (targetStatus === JobStatus.COMPLETED && updated.acceptedBid?.expertId) {
      await this.updateExpertCompletionStats(updated.acceptedBid.expertId);

      const expertUserId = updated.acceptedBid?.expert?.user?.id;
      const reviewPayload = (recipientId: string) => ({
        type: 'REVIEW_REQUESTED' as const,
        title: 'لطفاً نظر خود را ثبت کنید',
        titleEn: 'Leave a review',
        body: `کار "${updated.title}" تمام شد. نظر خود را ثبت کنید.`,
        bodyEn: `"${updated.title}" is complete. Share your experience.`,
        data: { jobId: updated.id },
      });

      await Promise.allSettled([
        this.notifications.notifyUser(updated.homeownerId, reviewPayload(updated.homeownerId)),
        ...(expertUserId ? [this.notifications.notifyUser(expertUserId, reviewPayload(expertUserId))] : []),
      ]);
    }

    return updated;
  }

  private async updateExpertCompletionStats(expertProfileId: string): Promise<void> {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
      select: { completedJobs: true, totalJobs: true },
    });
    if (!profile) return;

    const completedJobs = profile.completedJobs + 1;
    const totalJobs = profile.totalJobs + 1;
    const completionRate = Math.round((completedJobs / totalJobs) * 100);

    await this.prisma.expertProfile.update({
      where: { id: expertProfileId },
      data: { completedJobs, totalJobs, completionRate: completionRate / 100 },
    });
  }

  async cancel(jobId: string, homeowner: User, dto: CancelJobDto) {
    const job = await this.findOneOrFail(jobId);
    this.assertOwner(job, homeowner.id);
    assertTransitionAllowed(job.status, JobStatus.CANCELLED, UserRole.HOMEOWNER);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
      },
      include: JOB_INCLUDE,
    });

    // Refund bid credit to the accepted expert if one existed
    if (job.acceptedBidId) {
      const acceptedBid = await this.prisma.bid.findUnique({
        where: { id: job.acceptedBidId },
      });
      if (acceptedBid) {
        await this.credits.refundBid(acceptedBid.expertId, jobId);

        const expertUserId = job.acceptedBid?.expert?.user?.id;
        if (expertUserId) {
          await this.notifications.notifyUser(expertUserId, {
            type: 'JOB_CANCELLED',
            title: 'کار لغو شد',
            titleEn: 'Job cancelled',
            body: `کار "${job.title}" توسط صاحب خانه لغو شد. اعتبار شما بازگشت داده شد.`,
            bodyEn: `"${job.title}" was cancelled. Your bid credit has been refunded.`,
            data: { jobId },
          });
        }
      }
    }

    return updated;
  }

  async deleteDraft(jobId: string, homeowner: User) {
    const job = await this.findOneOrFail(jobId);
    this.assertOwner(job, homeowner.id);

    if (job.status !== JobStatus.DRAFT) {
      throw new ForbiddenException('Only draft jobs can be deleted.');
    }

    await this.prisma.job.delete({ where: { id: jobId } });
  }

  // ─── Expert-facing: browse open jobs in their zones ───────────────────────

  async browseForExpert(expert: User, query: QueryJobsDto) {
    const expertProfile = await this.prisma.expertProfile.findUnique({
      where: { userId: expert.id },
      include: { serviceZones: true },
    });

    if (!expertProfile) throw new ForbiddenException('Expert profile not found.');

    const zoneIds = expertProfile.serviceZones.map((z) => z.zoneId);
    if (zoneIds.length === 0) {
      return { data: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20, totalPages: 0 };
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: JobStatus.OPEN,
      zoneId: { in: zoneIds },
      ...(query.urgency && { urgency: query.urgency }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      bids: { none: { expertId: expertProfile.id } },
    };

    const [raw, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: BROWSE_JOB_INCLUDE,
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    // Shape the homeowner block — first name only, no phone, computed fields
    const data = raw.map((job) => {
      const { homeowner, ...rest } = job as any;
      return {
        ...rest,
        homeowner: homeowner
          ? {
              firstName: (homeowner.name as string).split(' ')[0],
              positivePoints: homeowner.homeownerProfile?.positivePoints ?? 0,
              jobsPosted: homeowner._count?.jobsAsHomeowner ?? 0,
            }
          : null,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Internal: called by BidsService after bid acceptance ─────────────────

  async assignBid(jobId: string, bidId: string, expertUserId: string) {
    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.ASSIGNED,
        acceptedBidId: bidId,
        assignedAt: new Date(),
      },
      include: JOB_INCLUDE,
    });

    await this.notifications.notifyUser(expertUserId, {
      type: 'BID_ACCEPTED',
      title: 'قیمت شما پذیرفته شد!',
      titleEn: 'Your bid was accepted!',
      body: `صاحب خانه قیمت شما را برای "${updated.title}" پذیرفت.`,
      bodyEn: `The homeowner accepted your bid for "${updated.title}".`,
      data: { jobId },
    });

    return updated;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async findOneOrFail(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        ...JOB_INCLUDE,
        homeowner: true,
        acceptedBid: { include: { expert: { include: { user: true } } } },
      },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    return job;
  }

  private assertOwner(job: { homeownerId: string }, userId: string) {
    if (job.homeownerId !== userId) {
      throw new ForbiddenException('You do not own this job.');
    }
  }

  private assertParticipant(job: any, actor: User) {
    if (actor.role === UserRole.HOMEOWNER) {
      this.assertOwner(job, actor.id);
      return;
    }

    if (actor.role === UserRole.EXPERT) {
      const expertProfile = job.acceptedBid?.expert;
      if (!expertProfile || expertProfile.user.id !== actor.id) {
        throw new ForbiddenException('You are not the assigned expert for this job.');
      }
    }
  }

  private assertViewAccess(job: any, actor: User) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.HOMEOWNER && job.homeownerId === actor.id) return;

    if (actor.role === UserRole.EXPERT) {
      // Expert can view: open jobs in their zones, or jobs they bid on / are assigned to
      if (job.status === JobStatus.OPEN) return;
      const isAssignedExpert = job.acceptedBid?.expert?.user?.id === actor.id;
      if (isAssignedExpert) return;
      throw new ForbiddenException('Access denied.');
    }

    throw new ForbiddenException('Access denied.');
  }

  private buildWhereClause(actor: User, filters: Partial<QueryJobsDto>) {
    const { status, urgency, categoryId, zoneId } = filters;
    const base = {
      ...(status && { status }),
      ...(urgency && { urgency }),
      ...(categoryId && { categoryId }),
      ...(zoneId && { zoneId }),
    };

    if (actor.role === UserRole.HOMEOWNER) {
      return { ...base, homeownerId: actor.id };
    }

    if (actor.role === UserRole.ADMIN) {
      return base;
    }

    // EXPERT: their own active/completed jobs
    return {
      ...base,
      acceptedBid: { expert: { userId: actor.id } },
    };
  }

  private async validateCategoryAndZone(categoryId: string, zoneId: string) {
    const [category, zone] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: categoryId } }),
      this.prisma.zone.findUnique({ where: { id: zoneId } }),
    ]);

    if (!category || !category.isActive) {
      throw new BadRequestException('Invalid or inactive category.');
    }
    if (!zone || !zone.isActive) {
      throw new BadRequestException('Invalid or inactive zone.');
    }
  }

  private redactHomeownerPhone(job: any, actor: User) {
    if (!job.homeowner) return job;
    if (actor.role === UserRole.ADMIN) return job;
    if (actor.role === UserRole.HOMEOWNER) return job;

    // Expert: phone only visible at ASSIGNED and beyond
    if (PHONE_VISIBLE_STATUSES.includes(job.status as JobStatus)) return job;

    const { phone: _phone, ...homeownerWithoutPhone } = job.homeowner;
    return { ...job, homeowner: homeownerWithoutPhone };
  }

  private async sendTransitionNotification(
    job: any,
    actor: User,
    targetStatus: JobStatus,
  ) {
    const notifyUserId =
      actor.role === UserRole.EXPERT
        ? job.homeownerId
        : job.acceptedBid?.expert?.user?.id;

    if (!notifyUserId) return;

    const notificationMap: Partial<Record<JobStatus, { title: string; titleEn: string; body: string; bodyEn: string; type: string }>> = {
      [JobStatus.EN_ROUTE]: {
        type: 'EXPERT_EN_ROUTE',
        title: 'متخصص در راه است',
        titleEn: 'Expert is on the way',
        body: `متخصص برای "${job.title}" در راه است.`,
        bodyEn: `Expert is heading to "${job.title}".`,
      },
      [JobStatus.ARRIVED]: {
        type: 'EXPERT_ARRIVED',
        title: 'متخصص رسید',
        titleEn: 'Expert has arrived',
        body: `متخصص برای "${job.title}" رسیده است.`,
        bodyEn: `Expert has arrived for "${job.title}".`,
      },
      [JobStatus.COMPLETION_REQUESTED]: {
        type: 'COMPLETION_REQUESTED',
        title: 'درخواست تکمیل کار',
        titleEn: 'Completion requested',
        body: `متخصص کار "${job.title}" را تمام‌شده اعلام کرد. لطفاً تأیید کنید.`,
        bodyEn: `Expert marked "${job.title}" as done. Please confirm.`,
      },
      [JobStatus.COMPLETED]: {
        type: 'JOB_COMPLETED',
        title: 'کار تکمیل شد',
        titleEn: 'Job completed',
        body: `کار "${job.title}" با موفقیت تکمیل شد.`,
        bodyEn: `"${job.title}" has been completed successfully.`,
      },
    };

    const notification = notificationMap[targetStatus];
    if (!notification) return;

    await this.notifications.notifyUser(notifyUserId, {
      type: notification.type as any,
      title: notification.title,
      titleEn: notification.titleEn,
      body: notification.body,
      bodyEn: notification.bodyEn,
      data: { jobId: job.id },
    });
  }
}
