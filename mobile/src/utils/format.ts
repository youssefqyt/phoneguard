import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/** "2h 15m" / "45m" / "30s" — compact screen-time formatting. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return `${Math.max(1, Math.round(seconds))}s`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** "1h 30m" style label for limit configuration. */
export function formatMinutes(minutes: number): string {
  return formatDuration(minutes * 60);
}

/** Percentage clamped to 0..100. */
export function percent(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

/** Today's date as `YYYY-MM-DD` in UTC (matches the API's day bucketing). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateKeyDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** "Fri 17 Oct" */
export function formatDateKey(key: string, format = 'ddd D MMM'): string {
  return dayjs(key).format(format);
}

/** "22:00" from minutes past midnight. */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(v => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Countdown label for a focus timer: "24:59". */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "Instagram" from "com.instagram.android" when no friendly name is known. */
export function packageToName(packageName: string): string {
  const segment = packageName.split('.').filter(Boolean).pop() ?? packageName;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
