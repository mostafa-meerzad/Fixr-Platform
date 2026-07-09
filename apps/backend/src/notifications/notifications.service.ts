import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from './firebase.provider';

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

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
  ) {}

  async notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, language: true },
    });

    // Persist to DB regardless of FCM delivery
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
      await this.sendFcm(user.fcmToken, payload, user.language).catch((err: Error) =>
        this.logger.warn(`FCM delivery failed for user ${userId}: ${err.message}`),
      );
    }
  }

  async notifyExpertsInZone(
    zoneId: string,
    payload: NotifyPayload,
    categoryId?: string,
  ): Promise<void> {
    const experts = await this.prisma.expertProfile.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        isAvailable: true,
        serviceZones: { some: { zoneId } },
        ...(categoryId && { serviceCategories: { some: { categoryId } } }),
        user: { isSuspended: false },
      },
      select: { userId: true },
    });

    await Promise.allSettled(
      experts.map((e) => this.notifyUser(e.userId, payload)),
    );
  }

  async getForUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  private async sendFcm(
    token: string,
    payload: NotifyPayload,
    language = 'fa',
  ): Promise<void> {
    const title = language === 'en' && payload.titleEn ? payload.titleEn : payload.title;
    const body  = language === 'en' && payload.bodyEn  ? payload.bodyEn  : payload.body;

    await this.firebaseApp.messaging().send({
      token,
      notification: { title, body },
      data: { type: String(payload.type), ...(payload.data ?? {}) },
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'fixr_default', icon: 'notification_icon', color: '#0D9488' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
  }
}
