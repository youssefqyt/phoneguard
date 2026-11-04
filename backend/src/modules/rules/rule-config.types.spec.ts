import { RuleType } from '@prisma/client';
import {
  assertValidConfig,
  isAppLimitConfig,
  isBlocklistConfig,
  isCategoryLimitConfig,
  isScheduleConfig,
} from './rule-config.types';

describe('rule config validation', () => {
  it('accepts a valid APP_LIMIT config', () => {
    const config = { packages: ['com.instagram.android'], dailyLimitMinutes: 30 };
    expect(isAppLimitConfig(config)).toBe(true);
    expect(() => assertValidConfig(RuleType.APP_LIMIT, config)).not.toThrow();
  });

  it('rejects an APP_LIMIT config with a non-array packages field', () => {
    const config = { packages: 'com.instagram.android', dailyLimitMinutes: 30 };
    expect(isAppLimitConfig(config)).toBe(false);
    expect(() => assertValidConfig(RuleType.APP_LIMIT, config)).toThrow(
      /Invalid configuration/,
    );
  });

  it('rejects an APP_LIMIT config without a numeric limit', () => {
    expect(
      isAppLimitConfig({ packages: ['a.b.c'], dailyLimitMinutes: '30' }),
    ).toBe(false);
  });

  it('accepts a CATEGORY_LIMIT config', () => {
    expect(
      isCategoryLimitConfig({ category: 'SOCIAL', dailyLimitMinutes: 45 }),
    ).toBe(true);
  });

  it('accepts a BLOCKLIST config', () => {
    expect(isBlocklistConfig({ packages: ['com.tiktok.musically'] })).toBe(true);
    expect(isBlocklistConfig({})).toBe(false);
  });

  it('accepts a SCHEDULE config', () => {
    const config = { days: [1, 2, 3], startTime: '22:00', endTime: '07:00' };
    expect(isScheduleConfig(config)).toBe(true);
    expect(() => assertValidConfig(RuleType.SCHEDULE, config)).not.toThrow();
  });

  it('validates BEDTIME using the schedule shape', () => {
    const config = { days: [6, 7], startTime: '21:30', endTime: '08:00' };
    expect(() => assertValidConfig(RuleType.BEDTIME, config)).not.toThrow();
  });

  it('throws for a mismatched type/config pairing', () => {
    expect(() =>
      assertValidConfig(RuleType.CATEGORY_LIMIT, { packages: ['a'] }),
    ).toThrow(/Invalid configuration/);
  });
});
