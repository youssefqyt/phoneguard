import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RuleType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { HouseholdAccessService } from '../../common/services/household-access.service';
import { parseDateKey, startOfUtcDay, toDateKey } from '../../common/utils/date.util';
import { CreateRuleDto, RuleQueryDto, UpdateRuleDto } from './dto/rule.dto';
import { assertValidConfig } from './rule-config.types';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
    private readonly access: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateRuleDto) {
    if (!dto.householdId && !dto.deviceId) {
      throw new BadRequestException('A rule must belong to a household or a device');
    }

    if (dto.householdId) {
      await this.access.assertGuardian(userId, dto.householdId);
    }
    if (dto.deviceId) {
      await this.assertDeviceControl(userId, dto.deviceId);
    }

    this.validateConfig(dto.type, dto.config);

    return this.prisma.rule.create({
      data: {
        householdId: dto.householdId,
        deviceId: dto.deviceId,
        name: dto.name,
        type: dto.type,
        action: dto.action,
        enabled: dto.enabled ?? true,
        priority: dto.priority ?? 0,
        config: dto.config as Prisma.InputJsonValue,
      },
    });
  }

  async list(userId: string, query: RuleQueryDto) {
    if (query.deviceId) {
      await this.devices.findAccessible(userId, query.deviceId);
    }

    const householdIds = await this.access.householdIdsForUser(userId);
    const where: Prisma.RuleWhereInput = {
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.householdId ? { householdId: query.householdId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.deviceId || query.householdId
        ? {}
        : {
            OR: [
              { householdId: { in: householdIds } },
              { device: { ownerId: userId } },
            ],
          }),
    };

    return this.prisma.rule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        device: { select: { id: true, name: true } },
        household: { select: { id: true, name: true } },
      },
    });
  }

  async getById(userId: string, ruleId: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.assertCanViewRule(userId, rule);
    return rule;
  }

  async update(userId: string, ruleId: string, dto: UpdateRuleDto) {
    const rule = await this.prisma.rule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.assertCanManageRule(userId, rule);

    if (dto.config) {
      this.validateConfig(rule.type, dto.config);
    }
    if (dto.deviceId !== undefined && dto.deviceId !== null) {
      await this.assertDeviceControl(userId, dto.deviceId);
    }

    return this.prisma.rule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        action: dto.action,
        enabled: dto.enabled,
        priority: dto.priority,
        deviceId: dto.deviceId === undefined ? undefined : dto.deviceId,
        config: dto.config
          ? (dto.config as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async toggle(userId: string, ruleId: string, enabled: boolean) {
    const rule = await this.prisma.rule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.assertCanManageRule(userId, rule);
    return this.prisma.rule.update({
      where: { id: ruleId },
      data: { enabled },
    });
  }

  async remove(userId: string, ruleId: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.assertCanManageRule(userId, rule);
    await this.prisma.rule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  /**
   * The policy bundle a device applies locally: every enabled rule plus the
   * current limit progress for the day.
   */
  async effective(userId: string, deviceId: string, dateKey?: string) {
    const device = await this.devices.findAccessible(userId, deviceId);
    const date = startOfUtcDay(dateKey ? parseDateKey(dateKey) : new Date());

    const [rules, progress] = await Promise.all([
      this.prisma.rule.findMany({
        where: {
          enabled: true,
          OR: [
            { deviceId },
            ...(device.householdId ? [{ householdId: device.householdId, deviceId: null }] : []),
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.limitProgress.findMany({
        where: { deviceId, date },
      }),
    ]);

    return {
      deviceId,
      date: toDateKey(date),
      generatedAt: new Date().toISOString(),
      rules,
      progress,
    };
  }

  async progress(userId: string, deviceId: string, dateKey?: string) {
    await this.devices.findAccessible(userId, deviceId);
    const date = startOfUtcDay(dateKey ? parseDateKey(dateKey) : new Date());
    return this.prisma.limitProgress.findMany({
      where: { deviceId, date },
      orderBy: { usedSeconds: 'desc' },
    });
  }

  // -------------------------------------------------------------------------
  // Authorisation helpers
  // -------------------------------------------------------------------------

  private async assertDeviceControl(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { ownerId: true, householdId: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (device.ownerId === userId) return;

    if (device.householdId) {
      const membership = await this.access.getMembership(userId, device.householdId);
      if (
        membership &&
        membership.status === 'ACTIVE' &&
        (membership.role === 'OWNER' || membership.role === 'PARENT')
      ) {
        return;
      }
    }
    throw new ForbiddenException('You cannot manage rules for this device');
  }

  private async assertCanViewRule(
    userId: string,
    rule: { householdId: string | null; deviceId: string | null },
  ) {
    if (rule.householdId) {
      await this.access.assertMember(userId, rule.householdId);
      return;
    }
    if (rule.deviceId) {
      await this.devices.findAccessible(userId, rule.deviceId);
      return;
    }
    throw new ForbiddenException('Rule has no scope');
  }

  private async assertCanManageRule(
    userId: string,
    rule: { householdId: string | null; deviceId: string | null },
  ) {
    if (rule.householdId) {
      await this.access.assertGuardian(userId, rule.householdId);
      return;
    }
    if (rule.deviceId) {
      await this.assertDeviceControl(userId, rule.deviceId);
      return;
    }
    throw new ForbiddenException('Rule has no scope');
  }

  private validateConfig(type: RuleType, config: Record<string, unknown>): void {
    try {
      assertValidConfig(type, config);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid rule config',
      );
    }
  }
}
