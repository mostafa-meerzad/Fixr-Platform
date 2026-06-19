import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JobStatus, User, UserRole } from '@prisma/client';

const REVIEW_WINDOW_HOURS = 48;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(jobId: string, reviewer: User, dto: CreateReviewDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        acceptedBid: { include: { expert: { include: { user: true } } } },
      },
    });

    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException('Reviews can only be submitted for completed jobs.');
    }

    // Determine who is reviewing whom
    const isHomeowner = reviewer.role === UserRole.HOMEOWNER && job.homeownerId === reviewer.id;
    const isAssignedExpert =
      reviewer.role === UserRole.EXPERT &&
      job.acceptedBid?.expert?.user?.id === reviewer.id;

    if (!isHomeowner && !isAssignedExpert) {
      throw new ForbiddenException('You are not a participant in this job.');
    }

    // Enforce 48-hour review window
    const windowExpiry = new Date(
      (job.completedAt ?? new Date()).getTime() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000,
    );
    if (new Date() > windowExpiry) {
      throw new BadRequestException(
        `The ${REVIEW_WINDOW_HOURS}-hour review window for this job has closed.`,
      );
    }

    // One review per reviewer per job
    const existing = await this.prisma.review.findUnique({ where: { jobId } });
    if (existing) throw new ConflictException('A review for this job has already been submitted.');

    // Reviewee is the other party
    const revieweeId = isHomeowner
      ? job.acceptedBid!.expert.user.id
      : job.homeownerId;

    const review = await this.prisma.review.create({
      data: {
        jobId,
        reviewerId: reviewer.id,
        revieweeId,
        rating: dto.rating,
        comment: dto.comment,
        isPositive: dto.isPositive,
        expiresAt: windowExpiry,
      },
    });

    // Update expert stats when homeowner reviews the expert
    if (isHomeowner && job.acceptedBid) {
      await this.updateExpertStats(job.acceptedBid.expertId, dto.rating, dto.isPositive);
    }

    // Update homeowner points when expert reviews the homeowner
    if (isAssignedExpert && dto.isPositive !== undefined) {
      await this.prisma.user.update({
        where: { id: revieweeId },
        data: dto.isPositive
          ? { expertProfile: undefined } // homeowner has no expertProfile — update via raw
          : undefined,
      });
      // Points are stored on profiles — for homeowners we track via the User model
      // A future iteration can add a HomeownerProfile model; for MVP we log it via the review record
    }

    return review;
  }

  async findForJob(jobId: string) {
    return this.prisma.review.findUnique({
      where: { jobId },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        reviewee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        job: { select: { id: true, title: true, completedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async updateExpertStats(
    expertProfileId: string,
    rating: number,
    isPositive?: boolean,
  ) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
    });
    if (!profile) return;

    const totalRatings = profile.completedJobs || 1;
    const newRating =
      (profile.rating * (totalRatings - 1) + rating) / totalRatings;

    await this.prisma.expertProfile.update({
      where: { id: expertProfileId },
      data: {
        rating: Math.round(newRating * 10) / 10,
        ...(isPositive === true && { positivePoints: { increment: 1 } }),
        ...(isPositive === false && { negativePoints: { increment: 1 } }),
      },
    });
  }
}
