/**
 * Date helpers. All usage telemetry is bucketed by UTC calendar day.
 */

export function startOfUtcDay(input: Date | string): Date {
  const date = typeof input === 'string' ? new Date(input) : new Date(input);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(input: Date, days: number): Date {
  const date = new Date(input);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function endOfUtcDay(input: Date | string): Date {
  return addUtcDays(startOfUtcDay(input), 1);
}

/** Formats a date as `YYYY-MM-DD` in UTC. */
export function toDateKey(input: Date | string): string {
  return startOfUtcDay(input).toISOString().slice(0, 10);
}

/** Parses `YYYY-MM-DD` (or an ISO string) into a UTC-normalised Date. */
export function parseDateKey(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00.000Z`);
  }
  return startOfUtcDay(input);
}

/** Inclusive list of day keys between two dates. */
export function dateRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

/** Converts "HH:mm" into minutes past midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h % 24) * 60 + (m % 60);
}

/**
 * Returns true when `nowMinutes` falls inside the [start, end) window.
 * Windows that cross midnight (start > end) are handled.
 */
export function isWithinWindow(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** ISO weekday number, 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}
