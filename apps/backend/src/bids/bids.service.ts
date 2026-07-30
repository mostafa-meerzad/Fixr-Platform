import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreditsService } from '../credits/credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { JobStatus, User, UserRole } from '@prisma/client';

const BID_INCLUDE = {
  expert: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
  ) {}

  async place(jobId: string, expert: User, dto: PlaceBidDto) {
    const job = await this.findOpenJobOrFail(jobId);

    // Expert cannot bid on a job posted in a zone they don't serve
    await this.assertExpertServesZone(expert.id, job.zoneId);

    // Prevent duplicate active bids (schema has unique constraint, this gives a clean error)
    const existing = await this.prisma.bid.findUnique({
      where: { jobId_expertId: { jobId, expertId: await this.getExpertProfileId(expert.id) } },
    });

    if (existing && !existing.isWithdrawn) {
      throw new ConflictException('You have already placed a bid on this job. Update or withdraw it instead.');
    }

    const expertProfileId = await this.getExpertProfileId(expert.id);

    // Spend 1 credit — throws BadRequestException if insufficient
    await this.credits.spendCredit(expertProfileId, jobId);

    const bid = await this.prisma.bid.create({
      data: {
        jobId,
        expertId: expertProfileId,
        price: dto.price,
        estimatedArrivalMinutes: dto.estimatedArrivalMinutes,
        estimatedDurationHours: dto.estimatedDurationHours,
        warrantyDescription: dto.warrantyDescription,
        expertMessage: dto.expertMessage,
      },
      include: BID_INCLUDE,
    });

    // Notify the homeowner
    await this.notifications.notifyUser(job.homeownerId, {
      type: 'BID_RECEIVED',
      title: 'قیمت جدید دریافت شد',
      titleEn: 'New bid received',
      body: `${expert.name} برای "${job.title}" قیمت داد.`,
      bodyEn: `${expert.name} placed a bid on "${job.title}".`,
      data: { jobId, bidId: bid.id },
    });

    return bid;
  }

  async update(bidId: string, expert: User, dto: UpdateBidDto) {
    const bid = await this.findBidOrFail(bidId);
    await this.assertBidOwner(bid, expert.id);
    this.assertBidEditable(bid);

    return this.prisma.bid.update({
      where: { id: bidId },
      data: { ...dto },
      include: BID_INCLUDE,
    });
  }

  async withdraw(bidId: string, expert: User) {
    const bid = await this.findBidOrFail(bidId);
    await this.assertBidOwner(bid, expert.id);
    this.assertBidEditable(bid);

    const updated = await this.prisma.bid.update({
      where: { id: bidId },
      data: { isWithdrawn: true },
      include: BID_INCLUDE,
    });

    await this.notifications.notifyUser(bid.job.homeownerId, {
      type: 'BID_WITHDRAWN',
      title: 'قیمت پس گرفته شد',
      titleEn: 'Bid withdrawn',
      body: `${expert.name} قیمت خود را برای "${bid.job.title}" پس گرفت.`,
      bodyEn: `${expert.name} withdrew their bid on "${bid.job.title}".`,
      data: { jobId: bid.job.id, bidId },
    });

    return updated;
  }

  async accept(jobId: string, bidId: string, homeowner: User) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { homeowner: true },
    });

    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    if (job.homeownerId !== homeowner.id) throw new ForbiddenException('You do not own this job.');
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException(`Cannot accept a bid on a job with status ${job.status}.`);
    }
    if (job.acceptedBidId) {
      throw new ConflictException('A bid has already been accepted for this job.');
    }

    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { expert: { include: { user: true } } },
    });

    if (!bid) throw new NotFoundException(`Bid ${bidId} not found.`);
    if (bid.jobId !== jobId) throw new BadRequestException('Bid does not belong to this job.');
    if (bid.isWithdrawn) throw new BadRequestException('This bid has been withdrawn.');

    // assignBid handles status → ASSIGNED, timestamps, and notifies the expert
    const updatedJob = await this.jobs.assignBid(jobId, bidId, bid.expert.user.id);

    return {
      job: updatedJob,
      bid,
    };
  }

  async listForJob(jobId: string, actor: User) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    if (actor.role === UserRole.HOMEOWNER) {
      if (job.homeownerId !== actor.id) throw new ForbiddenException('Access denied.');

      // Homeowner sees all non-withdrawn bids with expert public profile
      return this.prisma.bid.findMany({
        where: { jobId, isWithdrawn: false },
        include: {
          expert: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
              serviceZones: { include: { zone: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (actor.role === UserRole.EXPERT) {
      const expertProfileId = await this.getExpertProfileId(actor.id);
      // Expert sees only their own bid for this job
      return this.prisma.bid.findMany({
        where: { jobId, expertId: expertProfileId },
        include: BID_INCLUDE,
      });
    }

    // Admin sees all
    return this.prisma.bid.findMany({
      where: { jobId },
      include: BID_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async listForExpert(expert: User) {
    const expertProfileId = await this.getExpertProfileId(expert.id);
    return this.prisma.bid.findMany({
      where: { expertId: expertProfileId },
      include: {
        ...BID_INCLUDE,
        job: {
          include: { category: true, zone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async findOpenJobOrFail(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException(`This job is not open for bids (status: ${job.status}).`);
    }
    return job;
  }

  private async findBidOrFail(bidId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { expert: { include: { user: true } }, job: true },
    });
    if (!bid) throw new NotFoundException(`Bid ${bidId} not found.`);
    return bid;
  }

  private async assertBidOwner(bid: any, userId: string) {
    if (bid.expert.user.id !== userId) {
      throw new ForbiddenException('This bid does not belong to you.');
    }
  }

  private assertBidEditable(bid: any) {
    if (bid.isWithdrawn) {
      throw new BadRequestException('This bid has already been withdrawn.');
    }
    if (bid.job.acceptedBidId) {
      throw new BadRequestException('This bid has been accepted and can no longer be changed.');
    }
    if (bid.job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Bids can only be modified while the job is open.');
    }
  }

  private async getExpertProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Expert profile not found.');
    return profile.id;
  }

  private async assertExpertServesZone(userId: string, zoneId: string) {
    const profileId = await this.getExpertProfileId(userId);
    const zone = await this.prisma.expertZone.findUnique({
      where: { expertId_zoneId: { expertId: profileId, zoneId } },
    });
    if (!zone) {
      throw new ForbiddenException('You are not registered to serve this zone.');
    }
  }
}
