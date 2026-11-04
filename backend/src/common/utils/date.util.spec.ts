import {
  addUtcDays,
  dateRange,
  endOfUtcDay,
  isWithinWindow,
  isoWeekday,
  parseDateKey,
  startOfUtcDay,
  timeToMinutes,
  toDateKey,
} from './date.util';

describe('date.util', () => {
  describe('startOfUtcDay', () => {
    it('truncates to UTC midnight', () => {
      const result = startOfUtcDay(new Date('2026-10-17T23:45:12.500Z'));
      expect(result.toISOString()).toBe('2026-10-17T00:00:00.000Z');
    });

    it('accepts an ISO string', () => {
      expect(startOfUtcDay('2026-01-02T10:00:00Z').toISOString()).toBe(
        '2026-01-02T00:00:00.000Z',
      );
    });
  });

  describe('addUtcDays / endOfUtcDay', () => {
    it('adds days across month boundaries', () => {
      const result = addUtcDays(new Date('2026-01-31T00:00:00Z'), 1);
      expect(result.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });

    it('endOfUtcDay is the next midnight', () => {
      expect(endOfUtcDay('2026-03-09').toISOString()).toBe(
        '2026-03-10T00:00:00.000Z',
      );
    });
  });

  describe('toDateKey / parseDateKey', () => {
    it('round-trips a date key', () => {
      const key = toDateKey('2026-07-04T18:00:00Z');
      expect(key).toBe('2026-07-04');
      expect(parseDateKey(key).toISOString()).toBe('2026-07-04T00:00:00.000Z');
    });

    it('normalises an arbitrary ISO string', () => {
      expect(parseDateKey('2026-07-04T18:30:00Z').toISOString()).toBe(
        '2026-07-04T00:00:00.000Z',
      );
    });
  });

  describe('dateRange', () => {
    it('is inclusive of both ends', () => {
      const days = dateRange(new Date('2026-10-01'), new Date('2026-10-05'));
      expect(days.map(toDateKey)).toEqual([
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
        '2026-10-05',
      ]);
    });

    it('returns a single day when from === to', () => {
      expect(dateRange(new Date('2026-10-01'), new Date('2026-10-01'))).toHaveLength(1);
    });
  });

  describe('timeToMinutes / isWithinWindow', () => {
    it('converts HH:mm to minutes past midnight', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('handles daytime windows', () => {
      // 08:30–15:30
      expect(isWithinWindow(600, 510, 930)).toBe(true); // 10:00
      expect(isWithinWindow(500, 510, 930)).toBe(false); // 08:20
      expect(isWithinWindow(930, 510, 930)).toBe(false); // end is exclusive
    });

    it('handles windows that cross midnight', () => {
      // 22:00–07:00
      expect(isWithinWindow(1380, 1320, 420)).toBe(true); // 23:00
      expect(isWithinWindow(60, 1320, 420)).toBe(true); // 01:00
      expect(isWithinWindow(720, 1320, 420)).toBe(false); // 12:00
    });

    it('treats an equal start/end as always-on', () => {
      expect(isWithinWindow(0, 600, 600)).toBe(true);
    });
  });

  describe('isoWeekday', () => {
    it('maps Sunday to 7 and Monday to 1', () => {
      expect(isoWeekday(new Date('2026-10-18T00:00:00Z'))).toBe(7); // Sunday
      expect(isoWeekday(new Date('2026-10-19T00:00:00Z'))).toBe(1); // Monday
    });
  });
});
