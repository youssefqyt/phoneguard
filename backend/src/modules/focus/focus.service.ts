import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FocusStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardsService } from '../rewards/rewards.service';
import { StartFocusDto } from './dto/start-focus.dto';

/** Points awarded per completed focus session, scaled by duration. */
const POINTS_PER_MINUTE = 0.2; // → 9 points for a 45-minute session

@Injectable()
export class FocusService {
  private readonly logger = new Logger(FocusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly rewards: RewardsService,
  ) {}

  async start(userId: string, dto: StartFocusDto) {
    const existing = await this.prisma.focusSession.findFirst({
      where: { userId, status: FocusStatus.ACTIVE },
    });
    if (existing) {
      throw new BadRequestException('A focus session is already active');
    }

    const session = await this.prisma.focusSession.create({
      data: {
        userId,
        deviceId: dto.deviceId,
        label: dto.label,
        plannedMinutes: dto.plannedMinutes,
        status: FocusStatus.ACTIVE,
        blockedPackages: (dto.blockedPackages ?? []) as Prisma.InputJsonValue,
      },
    });

    await this.notifications.create(userId, {
      type: NotificationType.FOCUS_STARTED,
      title: 'Focus session started',
      body: `${dto.plannedMinutes} minutes${dto.label ? ` — ${dto.label}` : ''}`,
      data: { sessionId: session.id },
    });

    return session;
  }

  async stop(userId: string, sessionId: string) {
    const session = await this.getOwned(userId, sessionId);
    if (session.status !== FocusStatus.ACTIVE) {
      throw new BadRequestException('This session is not active');
    }

    const endedAt = new Date();
    const elapsedMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000),
    );
    const completed = elapsedMinutes >= session.plannedMinutes;

    const updated = await this.prisma.focusSession.update({
      where: { id: sessionId },
      data: { endedAt, status: FocusStatus.COMPLETED },
    });

    let pointsAwarded = 0;
    if (completed) {
      pointsAwarded = Math.round(session.plannedMinutes * POINTS_PER_MINUTE);
      if (pointsAwarded > 0) {
        await this.rewards.awardPoints(
          userId,
          pointsAwarded,
          'Focus session completed',
          'focus',
          sessionId,
        );
      }
    }

    await this.notifications.create(userId, {
      type: NotificationType.FOCUS_ENDED,
      title: completed ? 'Focus session complete 🎉' : 'Focus session ended',
      body: completed
        ? `Nice work — you earned ${pointsAwarded} points`
        : `You focused for ${elapsedMinutes} of ${session.plannedMinutes} minutes`,
      data: { sessionId, pointsAwarded },
    });

    return { ...updated, elapsedMinutes, completed, pointsAwarded };
  }

  async cancel(userId: string, sessionId: string) {
    const session = await this.getOwned(userId, sessionId);
    if (session.status !== FocusStatus.ACTIVE) {
      throw new BadRequestException('This session is not active');
    }
    return this.prisma.focusSession.update({
      where: { id: sessionId },
      data: { status: FocusStatus.CANCELLED, endedAt: new Date() },
    });
  }

  async active(userId: string) {
    return this.prisma.focusSession.findFirst({
      where: { userId, status: FocusStatus.ACTIVE },
      orderBy: { startedAt: 'desc' },
    });
  }

  async history(userId: string, take = 20) {
    return this.prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take,
    });
  }

  async stats(userId: string) {
    const [totals, completed] = await Promise.all([
      this.prisma.focusSession.aggregate({
        where: { userId, status: FocusStatus.COMPLETED },
        _sum: { plannedMinutes: true },
        _count: true,
      }),
      this.prisma.focusSession.count({
        where: { userId, status: FocusStatus.COMPLETED },
      }),
    ]);
    return {
      completedSessions: completed,
      totalMinutes: totals._sum.plannedMinutes ?? 0,
    };
  }

  /**
   * Auto-completes sessions that have run past their planned duration.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompleteExpired(): Promise<void> {
    const active = await this.prisma.focusSession.findMany({
      where: { status: FocusStatus.ACTIVE },
    });
    const now = Date.now();
    for (const session of active) {
      const deadline = session.startedAt.getTime() + session.plannedMinutes * 60000;
      if (now >= deadline) {
        try {
          await this.stop(session.userId, session.id);
        } catch (error) {
          this.logger.warn(
            `Failed to auto-complete session ${session.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
  }

  private async getOwned(userId: string, sessionId: string) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Focus session not found');
    }
    return session;
  }
}
