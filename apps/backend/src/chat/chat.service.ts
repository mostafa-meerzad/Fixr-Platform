import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, User, UserRole } from '@prisma/client';
import { StreamChat } from 'stream-chat';

@Injectable()
export class ChatService {
  private readonly streamClient: StreamChat;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.streamClient = StreamChat.getInstance(
      this.config.getOrThrow('STREAM_API_KEY'),
      this.config.getOrThrow('STREAM_API_SECRET'),
    );
  }

  /**
   * Returns a Stream Chat user token and the channel ID for a job.
   * Chat is only unlocked once a bid has been accepted (job.status >= ASSIGNED).
   */
  async getChatToken(jobId: string, requestor: User) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        homeowner: { select: { id: true, name: true, avatarUrl: true } },
        acceptedBid: {
          include: { expert: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
        },
      },
    });

    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    // Chat only available post-assignment
    const chatAllowedStatuses: JobStatus[] = [
      JobStatus.ASSIGNED,
      JobStatus.EN_ROUTE,
      JobStatus.ARRIVED,
      JobStatus.IN_PROGRESS,
      JobStatus.COMPLETION_REQUESTED,
      JobStatus.COMPLETED,
      JobStatus.DISPUTED,
    ];

    if (!chatAllowedStatuses.includes(job.status)) {
      throw new ForbiddenException(
        'Chat is only available after a bid has been accepted.',
      );
    }

    if (!job.acceptedBid) {
      throw new ForbiddenException('No accepted bid found for this job.');
    }

    const expertUser = job.acceptedBid.expert.user;
    const isHomeowner =
      requestor.role === UserRole.HOMEOWNER && job.homeownerId === requestor.id;
    const isExpert = requestor.role === UserRole.EXPERT && expertUser.id === requestor.id;

    if (!isHomeowner && !isExpert) {
      throw new ForbiddenException('You are not a participant in this job.');
    }

    // Upsert both users in Stream so the channel can be created
    await this.streamClient.upsertUsers([
      {
        id: job.homeowner.id,
        name: job.homeowner.name,
        image: job.homeowner.avatarUrl ?? undefined,
        role: 'user',
      },
      {
        id: expertUser.id,
        name: expertUser.name,
        image: expertUser.avatarUrl ?? undefined,
        role: 'user',
      },
    ]);

    // Deterministic channel ID so both sides join the same channel
    const channelId = `job-${jobId}`;

    const channel = this.streamClient.channel('messaging', channelId, {
      members: [job.homeowner.id, expertUser.id],
      name: job.title,
      created_by_id: job.homeowner.id,
    });

    await channel.create();

    // Issue a token valid for 24 hours
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const token = this.streamClient.createToken(requestor.id, expiresAt);

    return {
      token,
      channelId,
      channelType: 'messaging',
      apiKey: this.config.getOrThrow('STREAM_API_KEY'),
    };
  }
}
