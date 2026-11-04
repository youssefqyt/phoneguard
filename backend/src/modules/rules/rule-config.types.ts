import { RuleType } from '@prisma/client';

export interface AppLimitConfig {
  packages: string[];
  dailyLimitMinutes: number;
}

export interface CategoryLimitConfig {
  category: string;
  dailyLimitMinutes: number;
}

export interface BlocklistConfig {
  packages: string[];
}

export interface ScheduleConfig {
  days: number[]; // ISO weekdays, 1 = Monday … 7 = Sunday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export type BedtimeConfig = ScheduleConfig;

export interface RuleConfigMap {
  [RuleType.APP_LIMIT]: AppLimitConfig;
  [RuleType.CATEGORY_LIMIT]: CategoryLimitConfig;
  [RuleType.BLOCKLIST]: BlocklistConfig;
  [RuleType.SCHEDULE]: ScheduleConfig;
  [RuleType.BEDTIME]: BedtimeConfig;
}

export type AnyRuleConfig =
  | AppLimitConfig
  | CategoryLimitConfig
  | BlocklistConfig
  | ScheduleConfig;

export function isAppLimitConfig(value: unknown): value is AppLimitConfig {
  const v = value as Partial<AppLimitConfig> | null;
  return (
    !!v &&
    Array.isArray(v.packages) &&
    v.packages.every((p) => typeof p === 'string') &&
    typeof v.dailyLimitMinutes === 'number'
  );
}

export function isCategoryLimitConfig(
  value: unknown,
): value is CategoryLimitConfig {
  const v = value as Partial<CategoryLimitConfig> | null;
  return (
    !!v &&
    typeof v.category === 'string' &&
    typeof v.dailyLimitMinutes === 'number'
  );
}

export function isBlocklistConfig(value: unknown): value is BlocklistConfig {
  const v = value as Partial<BlocklistConfig> | null;
  return !!v && Array.isArray(v.packages);
}

export function isScheduleConfig(value: unknown): value is ScheduleConfig {
  const v = value as Partial<ScheduleConfig> | null;
  return (
    !!v &&
    Array.isArray(v.days) &&
    typeof v.startTime === 'string' &&
    typeof v.endTime === 'string'
  );
}

export function assertValidConfig(type: RuleType, config: unknown): void {
  const valid =
    (type === RuleType.APP_LIMIT && isAppLimitConfig(config)) ||
    (type === RuleType.CATEGORY_LIMIT && isCategoryLimitConfig(config)) ||
    (type === RuleType.BLOCKLIST && isBlocklistConfig(config)) ||
    (type === RuleType.SCHEDULE && isScheduleConfig(config)) ||
    (type === RuleType.BEDTIME && isScheduleConfig(config));
  if (!valid) {
    throw new Error(`Invalid configuration for rule type ${type}`);
  }
}
