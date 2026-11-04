import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small typed wrapper around AsyncStorage.
 *
 * NOTE: tokens are currently kept in AsyncStorage for portability. In a
 * production build, swap this implementation for `react-native-keychain`
 * (or an encrypted-store equivalent) — nothing else in the app needs to
 * change because every caller goes through this module.
 */

const NAMESPACE = 'phoneguard';

function key(name: string): string {
  return `${NAMESPACE}:${name}`;
}

export const StorageKeys = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  user: 'auth.user',
  deviceId: 'device.id',
  onboardingComplete: 'onboarding.complete',
} as const;

export async function getItem<T = string>(name: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(name));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch {
    return null;
  }
}

export async function setItem(name: string, value: unknown): Promise<void> {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key(name), raw);
  } catch {
    // Storage failures must never crash the UI.
  }
}

export async function removeItem(name: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(name));
  } catch {
    // ignore
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(`${NAMESPACE}:`));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignore
  }
}
