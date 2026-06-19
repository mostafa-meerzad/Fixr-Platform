import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface NotifyPayload {
  type: NotificationType | string;
  title: string;
  titleEn?: string;
  body: string;
  bodyEn?: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    // Persist notification record regardless of FCM delivery
    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type as NotificationType,
        title: payload.title,
        titleEn: payload.titleEn,
        body: payload.body,
        bodyEn: payload.bodyEn,
        data: payload.data ?? {},
      },
    });

    if (user?.fcmToken) {
      await this.sendFcm(user.fcmToken, payload).catch((err) =>
        this.logger.warn(`FCM delivery failed for user ${userId}: ${err.message}`),
      );
    }
  }

  async notifyExpertsInZone(zoneId: string, payload: NotifyPayload): Promise<void> {
    const experts = await this.prisma.expertProfile.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        isAvailable: true,
        serviceZones: { some: { zoneId } },
        user: { isSuspended: false },
      },
      select: { userId: true },
    });

    await Promise.allSettled(
      experts.map((e) => this.notifyUser(e.userId, payload)),
    );
  }

  private async sendFcm(token: string, payload: NotifyPayload): Promise<void> {
    // Firebase Admin SDK wired in a later step (NotificationsModule setup)
    // This is a placeholder that will be replaced when FirebaseModule is added
    this.logger.debug(`[FCM stub] → token: ${token.slice(0, 10)}… | ${payload.title}`);
  }
}
