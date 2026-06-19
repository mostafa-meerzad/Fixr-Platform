import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class NoShowService {
  private readonly logger = new Logger(NoShowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called periodically (e.g. every 15 min) to flag no-shows.
   * A no-show is an ASSIGNED job where the expert's estimated arrival time
   * + 2-hour grace period has passed but the job is still not EN_ROUTE or beyond.
   */
  async detectAndFlagNoShows(): Promise<void> {
    const now = new Date();

    // Find ASSIGNED jobs whose accepted bid ETA has expired
    const stalledJobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.ASSIGNED,
        acceptedBid: {
          isNot: null,
        },
      },
      include: {
        acceptedBid: true,
      },
    });

    for (const job of stalledJobs) {
      if (!job.acceptedBid || !job.assignedAt) continue;

      const etaMs = job.acceptedBid.estimatedArrivalMinutes * 60 * 1000;
      const noShowThreshold = new Date(job.assignedAt.getTime() + etaMs + GRACE_PERIOD_MS);

      if (now > noShowThreshold) {
        this.logger.log(`No-show detected for job ${job.id}, expert ${job.acceptedBid.expertId}`);

        await this.prisma.expertProfile.update({
          where: { id: job.acceptedBid.expertId },
          data: { noShowCount: { increment: 1 } },
        });

        // Move job back to OPEN so homeowner can accept a different bid
        await this.prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.OPEN,
            acceptedBidId: null,
            assignedAt: null,
          },
        });
      }
    }
  }
}
