import { http } from './client';
import type {
  AppNotification,
  AuthResponse,
  AuthTokens,
  Device,
  EffectivePolicy,
  FocusSession,
  Household,
  HouseholdMember,
  LimitProgress,
  Paginated,
  PointsEntry,
  Redemption,
  Reward,
  Rule,
  RuleType,
  UsageOverview,
  AppUsage,
  DailySeriesPoint,
  CategoryTotal,
  User,
} from './types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    role?: 'ADULT' | 'PARENT' | 'CHILD';
  }): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/register', input);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await http.get<User>('/auth/me');
    return data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refreshToken });
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  async updateProfile(input: {
    displayName?: string;
    timezone?: string;
    locale?: string;
  }): Promise<User> {
    const { data } = await http.patch<User>('/users/me', input);
    return data;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await http.post('/users/me/password', { currentPassword, newPassword });
  },
};

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export const householdsApi = {
  async list(): Promise<Household[]> {
    const { data } = await http.get<Household[]>('/households');
    return data;
  },

  async get(id: string): Promise<Household> {
    const { data } = await http.get<Household>(`/households/${id}`);
    return data;
  },

  async create(name: string): Promise<Household> {
    const { data } = await http.post<Household>('/households', { name });
    return data;
  },

  async listMembers(householdId: string): Promise<HouseholdMember[]> {
    const { data } = await http.get<HouseholdMember[]>(
      `/households/${householdId}/members`,
    );
    return data;
  },

  async createInvite(
    householdId: string,
    input: { email?: string; role?: string; expiresInDays?: number },
  ): Promise<{ id: string; code: string; expiresAt: string }> {
    const { data } = await http.post(`/households/${householdId}/invites`, input);
    return data;
  },

  async acceptInvite(code: string): Promise<HouseholdMember> {
    const { data } = await http.post<HouseholdMember>(
      '/households/invites/accept',
      { code },
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export const devicesApi = {
  async list(): Promise<Device[]> {
    const { data } = await http.get<Device[]>('/devices');
    return data;
  },

  async get(id: string): Promise<Device> {
    const { data } = await http.get<Device>(`/devices/${id}`);
    return data;
  },

  async register(input: {
    name: string;
    platform: 'ANDROID' | 'IOS';
    model?: string;
    manufacturer?: string;
    osVersion?: string;
    appVersion?: string;
    isManaged?: boolean;
  }): Promise<Device> {
    const { data } = await http.post<Device>('/devices', input);
    return data;
  },

  async pair(code: string, householdId?: string): Promise<Device> {
    const { data } = await http.post<Device>('/devices/pair', {
      code,
      householdId,
    });
    return data;
  },

  async heartbeat(id: string): Promise<void> {
    await http.post(`/devices/${id}/heartbeat`);
  },

  async update(
    id: string,
    input: { name?: string; pushToken?: string; appVersion?: string },
  ): Promise<Device> {
    const { data } = await http.patch<Device>(`/devices/${id}`, input);
    return data;
  },

  async revoke(id: string): Promise<void> {
    await http.delete(`/devices/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface IngestPayload {
  deviceId: string;
  date: string;
  apps: Array<{
    packageName: string;
    appName?: string;
    category?: string;
    totalSeconds: number;
    launches?: number;
    lastUsedAt?: string;
  }>;
  summary?: {
    screenTimeSeconds?: number;
    pickups?: number;
    notifications?: number;
    unlocks?: number;
    focusSeconds?: number;
  };
}

export const usageApi = {
  async ingest(payload: IngestPayload): Promise<{ accepted: number; date: string }> {
    const { data } = await http.post('/usage/ingest', payload);
    return data;
  },

  async overview(deviceId: string, date?: string): Promise<UsageOverview> {
    const { data } = await http.get<UsageOverview>('/usage/overview', {
      params: { deviceId, date },
    });
    return data;
  },

  async apps(deviceId: string, date?: string): Promise<{ date: string; apps: AppUsage[] }> {
    const { data } = await http.get<{ date: string; apps: AppUsage[] }>(
      '/usage/apps',
      { params: { deviceId, date } },
    );
    return data;
  },

  async range(
    deviceId: string,
    from: string,
    to: string,
  ): Promise<{ days: DailySeriesPoint[] }> {
    const { data } = await http.get<{ days: DailySeriesPoint[] }>(
      '/usage/range',
      { params: { deviceId, from, to } },
    );
    return data;
  },

  async categories(
    deviceId: string,
    from: string,
    to: string,
  ): Promise<CategoryTotal[]> {
    const { data } = await http.get<CategoryTotal[]>('/usage/categories', {
      params: { deviceId, from, to },
    });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface CreateRuleInput {
  householdId?: string;
  deviceId?: string;
  name: string;
  type: RuleType;
  action?: 'BLOCK' | 'WARN' | 'REMIND';
  enabled?: boolean;
  priority?: number;
  config: Record<string, unknown>;
}

export const rulesApi = {
  async list(params?: { deviceId?: string; householdId?: string }): Promise<Rule[]> {
    const { data } = await http.get<Rule[]>('/rules', { params });
    return data;
  },

  async create(input: CreateRuleInput): Promise<Rule> {
    const { data } = await http.post<Rule>('/rules', input);
    return data;
  },

  async update(id: string, input: Partial<CreateRuleInput>): Promise<Rule> {
    const { data } = await http.patch<Rule>(`/rules/${id}`, input);
    return data;
  },

  async toggle(id: string, enabled: boolean): Promise<Rule> {
    const { data } = await http.post<Rule>(`/rules/${id}/toggle`, { enabled });
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/rules/${id}`);
  },

  async effective(deviceId: string, date?: string): Promise<EffectivePolicy> {
    const { data } = await http.get<EffectivePolicy>(
      `/rules/effective/${deviceId}`,
      { params: { date } },
    );
    return data;
  },

  async progress(deviceId: string, date?: string): Promise<LimitProgress[]> {
    const { data } = await http.get<LimitProgress[]>(
      `/rules/progress/${deviceId}`,
      { params: { date } },
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------

export const focusApi = {
  async start(input: {
    plannedMinutes: number;
    label?: string;
    deviceId?: string;
    blockedPackages?: string[];
  }): Promise<FocusSession> {
    const { data } = await http.post<FocusSession>('/focus/start', input);
    return data;
  },

  async stop(id: string): Promise<FocusSession> {
    const { data } = await http.post<FocusSession>(`/focus/${id}/stop`);
    return data;
  },

  async cancel(id: string): Promise<FocusSession> {
    const { data } = await http.post<FocusSession>(`/focus/${id}/cancel`);
    return data;
  },

  async active(): Promise<FocusSession | null> {
    const { data } = await http.get<FocusSession | null>('/focus/active');
    return data;
  },

  async history(): Promise<FocusSession[]> {
    const { data } = await http.get<FocusSession[]>('/focus/history');
    return data;
  },

  async stats(): Promise<{ completedSessions: number; totalMinutes: number }> {
    const { data } = await http.get<{
      completedSessions: number;
      totalMinutes: number;
    }>('/focus/stats');
    return data;
  },
};

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export const rewardsApi = {
  async list(includeInactive = false): Promise<Reward[]> {
    const { data } = await http.get<Reward[]>('/rewards', {
      params: includeInactive ? { all: 'true' } : undefined,
    });
    return data;
  },

  async create(input: {
    title: string;
    description?: string;
    type: 'SCREEN_TIME' | 'APP_UNLOCK' | 'PRIVILEGE';
    pointCost: number;
    valueMinutes?: number;
    targetPackage?: string;
    icon?: string;
  }): Promise<Reward> {
    const { data } = await http.post<Reward>('/rewards', input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/rewards/${id}`);
  },

  async redeem(id: string, note?: string): Promise<Redemption> {
    const { data } = await http.post<Redemption>(`/rewards/${id}/redeem`, {
      note,
    });
    return data;
  },

  async redemptions(mine = false): Promise<Paginated<Redemption>> {
    const { data } = await http.get<Paginated<Redemption>>(
      '/rewards/redemptions',
      { params: mine ? { mine: 'true' } : undefined },
    );
    return data;
  },

  async decide(
    id: string,
    approve: boolean,
    note?: string,
  ): Promise<Redemption> {
    const { data } = await http.post<Redemption>(
      `/rewards/redemptions/${id}/decide`,
      { approve, note },
    );
    return data;
  },

  async points(): Promise<Paginated<PointsEntry>> {
    const { data } = await http.get<Paginated<PointsEntry>>('/rewards/points');
    return data;
  },

  async grantPoints(
    points: number,
    reason: string,
    targetUserId?: string,
    householdId?: string,
  ): Promise<{ balance: number }> {
    const { data } = await http.post<{ balance: number }>(
      '/rewards/points/grant',
      { points, reason, targetUserId, householdId },
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsApi = {
  async list(onlyUnread = false): Promise<AppNotification[]> {
    const { data } = await http.get<AppNotification[]>('/notifications', {
      params: onlyUnread ? { unread: 'true' } : undefined,
    });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await http.get<{ count: number }>(
      '/notifications/unread-count',
    );
    return data.count;
  },

  async markRead(id: string): Promise<void> {
    await http.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await http.post('/notifications/read-all');
  },

  async registerPushToken(pushToken: string, deviceId?: string): Promise<void> {
    await http.post('/notifications/push-token', { pushToken, deviceId });
  },
};
