declare const __PHONEGUARD_API_URL__: string;

export const API_URL =
  __PHONEGUARD_API_URL__ || 'http://localhost:3000/api/v1';

export const REFRESH_INTERVALS = {
  dashboard: 60_000,
  policy: 120_000,
  notifications: 45_000,
} as const;

export const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const APP_VERSION = '1.0.0';
