import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JobStatus, User, UserRole } from '@prisma/client';

const DISPUTABLE_STATUSES: JobStatus[] = [
  JobStatus.ASSIGNED,
  JobStatus.EN_ROUTE,
  JobStatus.ARRIVED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETION_REQUESTED,
];

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(jobId: string, reporter: User, dto: CreateDisputeDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { acceptedBid: { include: { expert: { include: { user: true } } } } },
    });

    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    if (!DISPUTABLE_STATUSES.includes(job.status)) {
      throw new BadRequestException(
        `Disputes can only be raised on active jobs (current status: ${job.status}).`,
      );
    }

    const isHomeowner = reporter.role === UserRole.HOMEOWNER && job.homeownerId === reporter.id;
    const isAssignedExpert =
      reporter.role === UserRole.EXPERT &&
      job.acceptedBid?.expert?.user?.id === reporter.id;

    if (!isHomeowner && !isAssignedExpert) {
      throw new ForbiddenException('You are not a participant in this job.');
    }

    const existing = await this.prisma.dispute.findUnique({ where: { jobId } });
    if (existing) throw new ConflictException('A dispute for this job already exists.');

    // Move job to DISPUTED status
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.DISPUTED },
    });

    const dispute = await this.prisma.dispute.create({
      data: {
        jobId,
        reporterId: reporter.id,
        reason: dto.reason,
        description: dto.description,
      },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        job: { select: { id: true, title: true, status: true } },
      },
    });

    // Notify the other party that a dispute was opened
    const otherPartyId =
      reporter.role === UserRole.HOMEOWNER
        ? job.acceptedBid?.expert?.user?.id
        : job.homeownerId;

    if (otherPartyId) {
      await this.notifications.notifyUser(otherPartyId, {
        type: 'DISPUTE_OPENED',
        title: 'اعتراض ثبت شد',
        titleEn: 'Dispute opened',
        body: `یک اعتراض برای کار "${job.title}" ثبت شده است.`,
        bodyEn: `A dispute has been opened for "${job.title}".`,
        data: { jobId },
      }).catch(() => {});
    }

    return dispute;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const include = {
      reporter: { select: { id: true, name: true, role: true } },
      job: {
        include: {
          homeowner: { select: { id: true, name: true } },
          acceptedBid: { include: { expert: { include: { user: { select: { id: true, name: true } } } } } },
          media: true,
        },
      },
    };
    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({ include, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.dispute.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        job: {
          include: {
            homeowner: { select: { id: true, name: true, phone: true } },
            category: true,
            zone: true,
            media: true,
            bids: {
              include: { expert: { include: { user: { select: { id: true, name: true, phone: true } } } } },
            },
            acceptedBid: { include: { expert: { include: { user: true } } } },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found.`);
    return dispute;
  }

  async resolve(disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.findOne(disputeId);

    if (dispute.resolvedAt) {
      throw new BadRequestException('This dispute has already been resolved.');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });

    // Notify both homeowner and expert that admin resolved the dispute
    const homeownerId = dispute.job.homeowner?.id;
    const expertUserId = dispute.job.acceptedBid?.expert?.user?.id;
    const jobTitle = dispute.job.title;

    await Promise.allSettled([
      homeownerId && this.notifications.notifyUser(homeownerId, {
        type: 'DISPUTE_RESOLVED',
        title: 'اعتراض حل‌وفصل شد',
        titleEn: 'Dispute resolved',
        body: `اعتراض برای کار "${jobTitle}" توسط ادمین حل‌وفصل شد.`,
        bodyEn: `The dispute for "${jobTitle}" has been resolved by admin.`,
        data: { jobId: dispute.jobId },
      }),
      expertUserId && this.notifications.notifyUser(expertUserId, {
        type: 'DISPUTE_RESOLVED',
        title: 'اعتراض حل‌وفصل شد',
        titleEn: 'Dispute resolved',
        body: `اعتراض برای کار "${jobTitle}" توسط ادمین حل‌وفصل شد.`,
        bodyEn: `The dispute for "${jobTitle}" has been resolved by admin.`,
        data: { jobId: dispute.jobId },
      }),
    ]);

    return updated;
  }

  async findForUser(userId: string) {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          { reporterId: userId },
          { job: { homeownerId: userId } },
          { job: { acceptedBid: { expert: { userId } } } },
        ],
      },
      include: {
        job: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
