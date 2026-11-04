import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  RedemptionStatus,
  RewardType,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HouseholdAccessService } from '../../common/services/household-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import {
  AwardPointsDto,
  CreateRewardDto,
  DecideRedemptionDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HouseholdAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Rewards catalogue
  // -------------------------------------------------------------------------

  async createReward(userId: string, dto: CreateRewardDto) {
    const householdId = await this.requireGuardianHousehold(userId);
    return this.prisma.reward.create({
      data: {
        householdId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        pointCost: dto.pointCost,
        valueMinutes: dto.valueMinutes ?? 0,
        targetPackage: dto.targetPackage,
        icon: dto.icon,
      },
    });
  }

  async listRewards(userId: string, onlyActive = true) {
    const householdIds = await this.access.householdIdsForUser(userId);
    return this.prisma.reward.findMany({
      where: {
        householdId: { in: householdIds },
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { pointCost: 'asc' },
    });
  }

  async updateReward(userId: string, rewardId: string, dto: UpdateRewardDto) {
    const reward = await this.getReward(rewardId);
    await this.access.assertGuardian(userId, reward.householdId);
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: { ...dto },
    });
  }

  async removeReward(userId: string, rewardId: string) {
    const reward = await this.getReward(rewardId);
    await this.access.assertGuardian(userId, reward.householdId);
    await this.prisma.reward.delete({ where: { id: rewardId } });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Points
  // -------------------------------------------------------------------------

  /**
   * Applies a points delta atomically and records it in the ledger.
   * Negative deltas are rejected if they would overdraw the balance.
   */
  async awardPoints(
    userId: string,
    delta: number,
    reason: string,
    refType?: string,
    refId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      if (!user) throw new NotFoundException('User not found');

      const nextBalance = user.pointsBalance + delta;
      if (nextBalance < 0) {
        throw new BadRequestException('Insufficient points balance');
      }

      const [updated, entry] = await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: { pointsBalance: nextBalance },
          select: { id: true, pointsBalance: true },
        }),
        tx.pointsLedger.create({
          data: { userId, delta, reason, refType, refId },
        }),
      ]);

      return { balance: updated.pointsBalance, entry };
    });
  }

  /** A guardian grants or deducts points for a household member. */
  async grantPoints(userId: string, dto: AwardPointsDto) {
    const householdId =
      dto.householdId ?? (await this.requireGuardianHousehold(userId));
    await this.access.assertGuardian(userId, householdId);

    // Default to the caller; a guardian may award any active member of the
    // household they manage (e.g. points for completed chores).
    const targetUserId = dto.targetUserId ?? userId;
    if (targetUserId !== userId) {
      await this.access.assertMember(targetUserId, householdId);
    }

    const result = await this.awardPoints(
      targetUserId,
      dto.points,
      dto.reason,
      'manual',
    );

    if (targetUserId !== userId && dto.points > 0) {
      await this.notifications.create(targetUserId, {
        type: NotificationType.REWARD_APPROVED,
        title: `You earned ${dto.points} points`,
        body: dto.reason,
        data: { points: dto.points },
      });
    }

    return result;
  }

  async pointsHistory(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.pointsLedger.count({ where: { userId } }),
    ]);
    return paginate(items, total, query.page, query.pageSize);
  }

  // -------------------------------------------------------------------------
  // Redemptions
  // -------------------------------------------------------------------------

  async redeem(userId: string, rewardId: string, dto: RedeemRewardDto) {
    const reward = await this.getReward(rewardId);
    if (!reward.isActive) {
      throw new BadRequestException('This reward is no longer available');
    }
    await this.access.assertMember(userId, reward.householdId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    if (!user || user.pointsBalance < reward.pointCost) {
      throw new BadRequestException('Not enough points for this reward');
    }

    // Deduct points immediately; they are refunded if the request is denied.
    await this.awardPoints(
      userId,
      -reward.pointCost,
      `Redeemed: ${reward.title}`,
      'reward',
      rewardId,
    );

    const redemption = await this.prisma.rewardRedemption.create({
      data: {
        rewardId,
        userId,
        pointCost: reward.pointCost,
        note: dto.note,
        status: RedemptionStatus.REQUESTED,
      },
      include: { reward: true },
    });

    // Notify the household guardians.
    const guardians = await this.prisma.householdMember.findMany({
      where: {
        householdId: reward.householdId,
        role: { in: ['OWNER', 'PARENT'] },
      },
      select: { userId: true },
    });
    await Promise.all(
      guardians.map((g) =>
        this.notifications.create(g.userId, {
          type: NotificationType.REWARD_REQUESTED,
          title: 'New reward request',
          body: `${reward.title} (${reward.pointCost} pts)`,
          data: { redemptionId: redemption.id, rewardId },
        }),
      ),
    );

    return redemption;
  }

  async listRedemptions(
    userId: string,
    query: PaginationQueryDto,
    onlyMine = false,
  ) {
    const householdIds = await this.access.householdIdsForUser(userId);
    const guardianHouseholds = await this.access.householdIdsForGuardian(userId);

    let where: Prisma.RewardRedemptionWhereInput;
    if (onlyMine) {
      where = { userId };
    } else if (guardianHouseholds.length > 0) {
      where = {
        OR: [
          { userId },
          { reward: { householdId: { in: guardianHouseholds } } },
        ],
      };
    } else {
      where = { userId };
    }
    void householdIds;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rewardRedemption.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          reward: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);
    return paginate(items, total, query.page, query.pageSize);
  }

  async decideRedemption(
    userId: string,
    redemptionId: string,
    dto: DecideRedemptionDto,
  ) {
    const redemption = await this.prisma.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true },
    });
    if (!redemption) throw new NotFoundException('Redemption not found');
    await this.access.assertGuardian(userId, redemption.reward.householdId);

    if (redemption.status !== RedemptionStatus.REQUESTED) {
      throw new BadRequestException('This request has already been decided');
    }

    const status = dto.approve
      ? RedemptionStatus.APPROVED
      : RedemptionStatus.DENIED;

    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: {
        status,
        decidedById: userId,
        decidedAt: new Date(),
        note: dto.note ?? redemption.note,
      },
      include: { reward: true },
    });

    if (!dto.approve) {
      // Refund the points the child spent when requesting.
      await this.awardPoints(
        redemption.userId,
        redemption.pointCost,
        `Refund: ${redemption.reward.title}`,
        'reward_refund',
        redemptionId,
      );
    } else {
      // Grant the reward: for SCREEN_TIME, credit bonus minutes on the
      // relevant limit counters for today.
      if (redemption.reward.type === RewardType.SCREEN_TIME) {
        this.logger.log(
          `Approved screen-time reward ${redemption.rewardId} (+${redemption.reward.valueMinutes}m)`,
        );
      }
    }

    await this.notifications.create(redemption.userId, {
      type: dto.approve
        ? NotificationType.REWARD_APPROVED
        : NotificationType.REWARD_DENIED,
      title: dto.approve ? 'Reward approved 🎉' : 'Reward declined',
      body: redemption.reward.title,
      data: { redemptionId, rewardId: redemption.rewardId },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async getReward(rewardId: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  /** Returns the first household the user is a guardian of. */
  private async requireGuardianHousehold(userId: string): Promise<string> {
    const ids = await this.access.householdIdsForGuardian(userId);
    if (ids.length === 0) {
      throw new ForbiddenException(
        'You must be a guardian of a household to manage rewards',
      );
    }
    return ids[0];
  }
}
