import { create } from 'zustand';
import { authApi } from '../api/endpoints';
import { clearSession, onAuthChange } from '../api/client';
import { StorageKeys, getItem, setItem } from '../utils/storage';
import type { AuthResponse, AuthTokens, User } from '../api/types';

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  /** Rehydrate the session from storage on app start. */
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: 'ADULT' | 'PARENT' | 'CHILD';
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  session: AuthResponse,
): void {
  set({
    status: 'authenticated',
    user: session.user,
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,

  async bootstrap() {
    const [accessToken, refreshToken, user] = await Promise.all([
      getItem<string>(StorageKeys.accessToken),
      getItem<string>(StorageKeys.refreshToken),
      getItem<User>(StorageKeys.user),
    ]);

    if (!accessToken || !refreshToken) {
      set({ status: 'unauthenticated', user: null });
      return;
    }

    set({
      status: 'authenticated',
      user: user ?? null,
      accessToken,
      refreshToken,
    });

    // Best-effort profile refresh; a failure leaves the cached user in place.
    try {
      const fresh = await authApi.me();
      await setItem(StorageKeys.user, fresh);
      set({ user: fresh });
    } catch {
      // handled by the axios interceptor (refresh or sign-out)
    }
  },

  async login(email, password) {
    const session = await authApi.login(email, password);
    await Promise.all([
      setItem(StorageKeys.accessToken, session.tokens.accessToken),
      setItem(StorageKeys.refreshToken, session.tokens.refreshToken),
      setItem(StorageKeys.user, session.user),
    ]);
    applySession(set, session);
  },

  async register(input) {
    const session = await authApi.register(input);
    await Promise.all([
      setItem(StorageKeys.accessToken, session.tokens.accessToken),
      setItem(StorageKeys.refreshToken, session.tokens.refreshToken),
      setItem(StorageKeys.user, session.user),
    ]);
    applySession(set, session);
  },

  async logout() {
    const refreshToken = get().refreshToken;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore — we clear locally regardless.
      }
    }
    await clearSession();
    set({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  async refreshProfile() {
    const user = await authApi.me();
    await setItem(StorageKeys.user, user);
    set({ user });
  },

  setUser(user) {
    set({ user });
    void setItem(StorageKeys.user, user);
  },
}));

// Keep the store in sync when the axios layer rotates or drops tokens.
onAuthChange((tokens: AuthTokens | null) => {
  if (tokens) {
    useAuthStore.setState({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } else {
    useAuthStore.setState({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  }
});
