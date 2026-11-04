import { Injectable, Logger } from '@nestjs/common';
import { RuleType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import {
  normaliseCategory,
  DEFAULT_PACKAGE_CATEGORIES,
} from '../../common/constants/app-categories';
import {
  addUtcDays,
  dateRange,
  parseDateKey,
  startOfUtcDay,
  toDateKey,
} from '../../common/utils/date.util';
import {
  IngestUsageDto,
  type UsageDayQueryDto,
  type UsageRangeQueryDto,
} from './dto/usage.dto';
import {
  isAppLimitConfig,
  isCategoryLimitConfig,
} from '../rules/rule-config.types';

export interface CategoryTotal {
  category: string;
  totalSeconds: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
  ) {}

  // -------------------------------------------------------------------------
  // Ingestion
  // -------------------------------------------------------------------------

  /**
   * Accepts a batch of per-app usage for a single day, upserts the daily
   * aggregates, records the device summary and refreshes limit counters.
   */
  async ingest(userId: string, dto: IngestUsageDto) {
    await this.devices.assertOwnership(userId, dto.deviceId);
    const date = parseDateKey(dto.date);

    const operations: Prisma.PrismaPromise<unknown>[] = dto.apps.map((app) => {
      const category =
        normaliseCategory(app.category) !== 'OTHER' || !app.category
          ? normaliseCategory(
              app.category ?? DEFAULT_PACKAGE_CATEGORIES[app.packageName],
            )
          : normaliseCategory(app.category);

      return this.prisma.appUsageDaily.upsert({
        where: {
          deviceId_packageName_date: {
            deviceId: dto.deviceId,
            packageName: app.packageName,
            date,
          },
        },
        create: {
          deviceId: dto.deviceId,
          packageName: app.packageName,
          appName: app.appName,
          category,
          date,
          totalSeconds: app.totalSeconds,
          launches: app.launches ?? 0,
          lastUsedAt: app.lastUsedAt ? new Date(app.lastUsedAt) : null,
        },
        update: {
          appName: app.appName,
          category,
          totalSeconds: app.totalSeconds,
          launches: app.launches ?? 0,
          lastUsedAt: app.lastUsedAt ? new Date(app.lastUsedAt) : null,
        },
      });
    });

    if (dto.summary) {
      const s = dto.summary;
      operations.push(
        this.prisma.dailySummary.upsert({
          where: { deviceId_date: { deviceId: dto.deviceId, date } },
          create: {
            deviceId: dto.deviceId,
            date,
            screenTimeSeconds: s.screenTimeSeconds ?? 0,
            pickups: s.pickups ?? 0,
            notifications: s.notifications ?? 0,
            unlocks: s.unlocks ?? 0,
            focusSeconds: s.focusSeconds ?? 0,
          },
          update: {
            screenTimeSeconds: s.screenTimeSeconds ?? undefined,
            pickups: s.pickups ?? undefined,
            notifications: s.notifications ?? undefined,
            unlocks: s.unlocks ?? undefined,
            focusSeconds: s.focusSeconds ?? undefined,
          },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    await this.prisma.device.update({
      where: { id: dto.deviceId },
      data: { lastSeenAt: new Date(), lastSyncedAt: new Date() },
    });

    await this.refreshLimitProgress(dto.deviceId, date);

    return {
      accepted: dto.apps.length,
      date: toDateKey(date),
      deviceId: dto.deviceId,
    };
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /** Headline numbers for a device on a given day. */
  async overview(userId: string, query: UsageDayQueryDto) {
    await this.devices.findAccessible(userId, query.deviceId);
    const date = startOfUtcDay(query.date ? parseDateKey(query.date) : new Date());
    const prevDate = addUtcDays(date, -1);

    const [summary, prevSummary, topApps, categories, week] = await Promise.all([
      this.prisma.dailySummary.findUnique({
        where: { deviceId_date: { deviceId: query.deviceId, date } },
      }),
      this.prisma.dailySummary.findUnique({
        where: { deviceId_date: { deviceId: query.deviceId, date: prevDate } },
      }),
      this.prisma.appUsageDaily.findMany({
        where: { deviceId: query.deviceId, date },
        orderBy: { totalSeconds: 'desc' },
        take: 5,
      }),
      this.categoryTotals(query.deviceId, date),
      this.dailySeries(query.deviceId, addUtcDays(date, -6), date),
    ]);

    const screenTimeSeconds =
      summary?.screenTimeSeconds ??
      (await this.sumScreenTime(query.deviceId, date));
    const prevScreenTimeSeconds =
      prevSummary?.screenTimeSeconds ??
      (await this.sumScreenTime(query.deviceId, prevDate));

    const delta = screenTimeSeconds - prevScreenTimeSeconds;
    const deltaPercent =
      prevScreenTimeSeconds > 0
        ? Math.round((delta / prevScreenTimeSeconds) * 100)
        : null;

    return {
      date: toDateKey(date),
      screenTimeSeconds,
      previousDay: {
        date: toDateKey(prevDate),
        screenTimeSeconds: prevScreenTimeSeconds,
      },
      changePercent: deltaPercent,
      pickups: summary?.pickups ?? 0,
      notifications: summary?.notifications ?? 0,
      unlocks: summary?.unlocks ?? 0,
      focusSeconds: summary?.focusSeconds ?? 0,
      topApps: topApps.map((a) => ({
        packageName: a.packageName,
        appName: a.appName,
        category: a.category,
        totalSeconds: a.totalSeconds,
        launches: a.launches,
      })),
      categories,
      week,
    };
  }

  async appsForDay(userId: string, query: UsageDayQueryDto) {
    await this.devices.findAccessible(userId, query.deviceId);
    const date = startOfUtcDay(query.date ? parseDateKey(query.date) : new Date());
    const apps = await this.prisma.appUsageDaily.findMany({
      where: { deviceId: query.deviceId, date },
      orderBy: { totalSeconds: 'desc' },
    });
    return { date: toDateKey(date), apps };
  }

  /** Daily screen-time series across a range (inclusive). */
  async range(userId: string, query: UsageRangeQueryDto) {
    await this.devices.findAccessible(userId, query.deviceId);
    const from = startOfUtcDay(parseDateKey(query.from));
    const to = startOfUtcDay(parseDateKey(query.to));
    if (to.getTime() < from.getTime()) {
      [from.setTime(to.getTime()), to.setTime(from.getTime())];
    }
    return {
      deviceId: query.deviceId,
      from: toDateKey(from),
      to: toDateKey(to),
      days: await this.dailySeries(query.deviceId, from, to),
    };
  }

  async categoryBreakdown(userId: string, query: UsageRangeQueryDto) {
    await this.devices.findAccessible(userId, query.deviceId);
    const from = startOfUtcDay(parseDateKey(query.from));
    const to = startOfUtcDay(parseDateKey(query.to));

    const grouped = await this.prisma.appUsageDaily.groupBy({
      by: ['category'],
      where: {
        deviceId: query.deviceId,
        date: { gte: from, lte: to },
      },
      _sum: { totalSeconds: true },
    });

    return grouped
      .map((g) => ({
        category: g.category ?? 'OTHER',
        totalSeconds: g._sum.totalSeconds ?? 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async sumScreenTime(deviceId: string, date: Date): Promise<number> {
    const agg = await this.prisma.appUsageDaily.aggregate({
      where: { deviceId, date },
      _sum: { totalSeconds: true },
    });
    return agg._sum.totalSeconds ?? 0;
  }

  private async categoryTotals(
    deviceId: string,
    date: Date,
  ): Promise<CategoryTotal[]> {
    const grouped = await this.prisma.appUsageDaily.groupBy({
      by: ['category'],
      where: { deviceId, date },
      _sum: { totalSeconds: true },
    });
    return grouped
      .map((g) => ({
        category: g.category ?? 'OTHER',
        totalSeconds: g._sum.totalSeconds ?? 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }

  private async dailySeries(deviceId: string, from: Date, to: Date) {
    const [summaries, usageByDay] = await Promise.all([
      this.prisma.dailySummary.findMany({
        where: { deviceId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.appUsageDaily.groupBy({
        by: ['date'],
        where: { deviceId, date: { gte: from, lte: to } },
        _sum: { totalSeconds: true },
      }),
    ]);

    const summaryMap = new Map(
      summaries.map((s) => [toDateKey(s.date), s]),
    );
    const usageMap = new Map(
      usageByDay.map((u) => [toDateKey(u.date), u._sum.totalSeconds ?? 0]),
    );

    return dateRange(from, to).map((day) => {
      const key = toDateKey(day);
      const summary = summaryMap.get(key);
      return {
        date: key,
        screenTimeSeconds:
          summary?.screenTimeSeconds ?? usageMap.get(key) ?? 0,
        pickups: summary?.pickups ?? 0,
        notifications: summary?.notifications ?? 0,
        focusSeconds: summary?.focusSeconds ?? 0,
      };
    });
  }

  /**
   * Recomputes per-app and per-category limit counters for a device/day based
   * on the active rules. Called after each ingest so the client can show
   * accurate "used / remaining" figures without recomputing locally.
   */
  private async refreshLimitProgress(deviceId: string, date: Date): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { householdId: true },
    });

    const rules = await this.prisma.rule.findMany({
      where: {
        enabled: true,
        OR: [
          { deviceId },
          ...(device?.householdId
            ? [{ householdId: device.householdId, deviceId: null }]
            : []),
        ],
        type: { in: [RuleType.APP_LIMIT, RuleType.CATEGORY_LIMIT] },
      },
    });

    if (rules.length === 0) return;

    const apps = await this.prisma.appUsageDaily.findMany({
      where: { deviceId, date },
      select: { packageName: true, category: true, totalSeconds: true },
    });

    for (const rule of rules) {
      if (rule.type === RuleType.APP_LIMIT && isAppLimitConfig(rule.config)) {
        const packages = rule.config.packages;
        for (const pkg of packages) {
          const app = apps.find((a) => a.packageName === pkg);
          const used = app?.totalSeconds ?? 0;
          const limitSeconds = rule.config.dailyLimitMinutes * 60;
          await this.prisma.limitProgress.upsert({
            where: {
              deviceId_ruleId_packageName_date: {
                deviceId,
                ruleId: rule.id,
                packageName: pkg,
                date,
              },
            },
            create: {
              deviceId,
              ruleId: rule.id,
              packageName: pkg,
              date,
              usedSeconds: used,
              blockedAt: used >= limitSeconds ? new Date() : null,
            },
            update: {
              usedSeconds: used,
              blockedAt: used >= limitSeconds ? new Date() : null,
            },
          });
        }
      }

      if (
        rule.type === RuleType.CATEGORY_LIMIT &&
        isCategoryLimitConfig(rule.config)
      ) {
        const category = normaliseCategory(rule.config.category);
        const used = apps
          .filter((a) => normaliseCategory(a.category) === category)
          .reduce((sum, a) => sum + a.totalSeconds, 0);
        const limitSeconds = rule.config.dailyLimitMinutes * 60;
        await this.prisma.limitProgress.upsert({
          where: {
            deviceId_ruleId_packageName_date: {
              deviceId,
              ruleId: rule.id,
              packageName: `category:${category}`,
              date,
            },
          },
          create: {
            deviceId,
            ruleId: rule.id,
            packageName: `category:${category}`,
            date,
            usedSeconds: used,
            blockedAt: used >= limitSeconds ? new Date() : null,
          },
          update: {
            usedSeconds: used,
            blockedAt: used >= limitSeconds ? new Date() : null,
          },
        });
      }
    }

    this.logger.debug(
      `Refreshed limit progress for device ${deviceId} on ${toDateKey(date)}`,
    );
  }
}
