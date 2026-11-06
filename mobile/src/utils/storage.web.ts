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

function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export async function getItem<T = string>(name: string): Promise<T | null> {
  try {
    const raw = getSessionStorage()?.getItem(key(name));
    if (raw == null) return null;
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
    getSessionStorage()?.setItem(key(name), raw);
  } catch {
    // Storage failures must never crash the UI.
  }
}

export async function removeItem(name: string): Promise<void> {
  try {
    getSessionStorage()?.removeItem(key(name));
  } catch {
    // ignore
  }
}

export async function clearAll(): Promise<void> {
  try {
    const storage = getSessionStorage();
    if (!storage) return;
    const ours: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const current = storage.key(index);
      if (current?.startsWith(`${NAMESPACE}:`)) ours.push(current);
    }
    ours.forEach(current => storage.removeItem(current));
  } catch {
    // ignore
  }
}
