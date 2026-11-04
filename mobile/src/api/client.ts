import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_URL } from '../config';
import { StorageKeys, getItem, removeItem, setItem } from '../utils/storage';
import { ApiError, type AuthTokens } from './types';

/**
 * Shared axios instance.
 *
 * - Injects the bearer token on every request.
 * - On a 401 it performs a single refresh (de-duplicated across concurrent
 *   requests) and replays the original request once.
 */

type Listener = (tokens: AuthTokens | null) => void;

const authListeners = new Set<Listener>();

export function onAuthChange(listener: Listener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function emitAuth(tokens: AuthTokens | null): void {
  for (const listener of authListeners) listener(tokens);
}

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use(async config => {
  const token = await getItem<string>(StorageKeys.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = await getItem<string>(StorageKeys.refreshToken);
  if (!refreshToken) return null;

  try {
    // Use a bare axios call so the 401 interceptor cannot recurse.
    const { data } = await axios.post<AuthTokens>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 20_000, headers: { 'Content-Type': 'application/json' } },
    );
    await setItem(StorageKeys.accessToken, data.accessToken);
    await setItem(StorageKeys.refreshToken, data.refreshToken);
    emitAuth(data);
    return data;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await removeItem(StorageKeys.accessToken);
  await removeItem(StorageKeys.refreshToken);
  await removeItem(StorageKeys.user);
  emitAuth(null);
}

http.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const status = error.response?.status;
    const isRefreshCall = config?.url?.includes('/auth/refresh');

    if (status === 401 && config && !config._retried && !isRefreshCall) {
      config._retried = true;
      refreshInFlight = refreshInFlight ?? refreshTokens();
      const tokens = await refreshInFlight;
      refreshInFlight = null;

      if (tokens) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return http.request(config);
      }
    }

    const body = error.response?.data;
    const message =
      (typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : undefined) ??
      error.message ??
      'Something went wrong';

    return Promise.reject(
      new ApiError(status ?? 0, message, body ?? null),
    );
  },
);
