import { Platform } from 'react-native';
import { BUILD_API_URL } from './buildConfig';

/**
 * Runtime configuration.
 *
 * `API_URL` is resolved in this order:
 *   1. `API_URL` from the environment
 *   2. the URL embedded in the Android build
 *   3. a sensible simulator/emulator default
 *
 * The Android emulator reaches the host machine on 10.0.2.2, the iOS
 * simulator on localhost. A physical device needs a reachable API URL.
 */

function resolveDevHost(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api/v1';
  return 'http://localhost:3000/api/v1';
}

declare const process: { env?: Record<string, string | undefined> } | undefined;

function envValue(key: string): string | undefined {
  try {
    return typeof process !== 'undefined' ? process?.env?.[key] : undefined;
  } catch {
    return undefined;
  }
}

export const API_URL: string =
  envValue('API_URL') ?? BUILD_API_URL ?? resolveDevHost();

/** Polling intervals (ms) for background-ish refreshes. */
export const REFRESH_INTERVALS = {
  dashboard: 60_000,
  policy: 120_000,
  notifications: 45_000,
} as const;

/** How often the on-device usage collector flushes to the API (ms). */
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const APP_VERSION = '1.0.0';
