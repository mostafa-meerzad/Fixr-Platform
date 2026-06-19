import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobStatus } from '@prisma/client';

const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class NoShowService {
  private readonly logger = new Logger(NoShowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Runs every 15 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async detectAndFlagNoShows(): Promise<void> {
    const now = new Date();

    const stalledJobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.ASSIGNED,
        assignedAt: { not: null },
        acceptedBid: { isNot: null },
      },
      include: {
        acceptedBid: true,
        homeowner: { select: { id: true } },
      },
    });

    for (const job of stalledJobs) {
      if (!job.acceptedBid || !job.assignedAt) continue;

      const etaMs = job.acceptedBid.estimatedArrivalMinutes * 60 * 1000;
      const noShowThreshold = new Date(job.assignedAt.getTime() + etaMs + GRACE_PERIOD_MS);

      if (now <= noShowThreshold) continue;

      this.logger.log(`No-show: job ${job.id}, expert profile ${job.acceptedBid.expertId}`);

      await this.prisma.$transaction([
        // Increment expert no-show count
        this.prisma.expertProfile.update({
          where: { id: job.acceptedBid.expertId },
          data: { noShowCount: { increment: 1 } },
        }),
        // Return job to OPEN so homeowner can accept another bid
        this.prisma.job.update({
          where: { id: job.id },
          data: { status: JobStatus.OPEN, acceptedBidId: null, assignedAt: null },
        }),
      ]);

      // Notify homeowner
      await this.notifications.notifyUser(job.homeowner.id, {
        type: 'JOB_CANCELLED',
        title: 'متخصص نیامد',
        titleEn: 'Expert did not show up',
        body: `متخصص برای "${job.title}" نیامد. می‌توانید قیمت دیگری بپذیرید.`,
        bodyEn: `The expert did not arrive for "${job.title}". You can accept another bid.`,
        data: { jobId: job.id },
      });
    }
  }
}
