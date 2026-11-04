import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto/notification.dto';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a notification and best-effort delivers it via Expo push.
   * Never throws on delivery failure — persistence is the source of truth.
   */
  async create(userId: string, input: NotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    });

    void this.deliver(userId, input);
    return notification;
  }

  async list(userId: string, onlyUnread: boolean, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    if (dto.deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { id: dto.deviceId },
        select: { ownerId: true },
      });
      if (device && device.ownerId === userId) {
        await this.prisma.device.update({
          where: { id: dto.deviceId },
          data: { pushToken: dto.pushToken },
        });
      }
    }
    return { success: true };
  }

  /** Sends the notification to every push token registered for the user. */
  private async deliver(
    userId: string,
    input: NotificationInput,
  ): Promise<void> {
    try {
      const devices = await this.prisma.device.findMany({
        where: { ownerId: userId, pushToken: { not: null } },
        select: { pushToken: true },
      });
      const tokens = devices
        .map((d) => d.pushToken)
        .filter((t): t is string => !!t && t.startsWith('Exponent'));
      if (tokens.length === 0) return;

      const messages: ExpoPushMessage[] = tokens.map((to) => ({
        to,
        title: input.title,
        body: input.body,
        data: input.data,
        sound: 'default',
      }));

      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        this.logger.warn(
          `Expo push responded ${response.status} for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Push delivery failed for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
