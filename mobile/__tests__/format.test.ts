/**
 * Formatting helpers — the numbers every screen renders.
 *
 * @format
 */

import {
  formatCountdown,
  formatDateKey,
  formatDuration,
  formatMinutes,
  initials,
  minutesToTime,
  packageToName,
  percent,
  timeToMinutes,
} from '../src/utils/format';

describe('formatDuration', () => {
  it('renders sub-minute values in seconds', () => {
    expect(formatDuration(20)).toBe('20s');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-5)).toBe('0m');
  });

  it('renders minutes and hours compactly', () => {
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(90 * 60)).toBe('1h 30m');
    expect(formatDuration(2 * 3600 + 15 * 60)).toBe('2h 15m');
  });
});

describe('formatMinutes', () => {
  it('treats its input as minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(0)).toBe('0m');
  });
});

describe('percent', () => {
  it('clamps to 0..100 and avoids divide-by-zero', () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(200, 100)).toBe(100);
    expect(percent(-10, 100)).toBe(0);
    expect(percent(10, 0)).toBe(0);
  });
});

describe('clock helpers', () => {
  it('round-trips minutes and HH:mm', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(22 * 60)).toBe('22:00');
    expect(minutesToTime(7 * 60 + 5)).toBe('07:05');
    expect(timeToMinutes('22:00')).toBe(1320);
    expect(timeToMinutes('07:05')).toBe(425);
  });

  it('wraps past midnight', () => {
    expect(minutesToTime(24 * 60 + 30)).toBe('00:30');
  });
});

describe('formatCountdown', () => {
  it('renders mm:ss and never goes negative', () => {
    expect(formatCountdown(25 * 60 * 1000)).toBe('25:00');
    expect(formatCountdown(59_000)).toBe('00:59');
    expect(formatCountdown(-1000)).toBe('00:00');
  });
});

describe('formatDateKey', () => {
  it('formats ISO day keys with dayjs', () => {
    expect(formatDateKey('2026-10-17', 'YYYY-MM-DD')).toBe('2026-10-17');
  });
});

describe('packageToName', () => {
  it('falls back to the last package segment, title-cased', () => {
    expect(packageToName('com.instagram.android')).toBe('Android');
    expect(packageToName('com.spotify.music')).toBe('Music');
    expect(packageToName('single')).toBe('Single');
  });
});

describe('initials', () => {
  it('handles one, two and many names', () => {
    expect(initials('Alex')).toBe('AL');
    expect(initials('Alex Morgan')).toBe('AM');
    expect(initials('Alex J Morgan')).toBe('AM');
    expect(initials('   ')).toBe('?');
  });
});
