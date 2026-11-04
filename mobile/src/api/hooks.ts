import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  devicesApi,
  focusApi,
  householdsApi,
  notificationsApi,
  rewardsApi,
  rulesApi,
  usageApi,
  type CreateRuleInput,
  type IngestPayload,
} from './endpoints';
import type {
  AppNotification,
  AppUsage,
  CategoryTotal,
  DailySeriesPoint,
  Device,
  EffectivePolicy,
  FocusSession,
  Household,
  LimitProgress,
  Paginated,
  PointsEntry,
  Redemption,
  Reward,
  Rule,
  UsageOverview,
} from './types';
import { dateKeyDaysAgo } from '../utils/format';

/** Central query keys — keeps invalidation consistent. */
export const qk = {
  devices: ['devices'] as const,
  device: (id: string) => ['devices', id] as const,
  households: ['households'] as const,
  household: (id: string) => ['households', id] as const,
  usageOverview: (deviceId: string, date?: string) =>
    ['usage', 'overview', deviceId, date ?? 'today'] as const,
  usageApps: (deviceId: string, date?: string) =>
    ['usage', 'apps', deviceId, date ?? 'today'] as const,
  usageRange: (deviceId: string, days: number) =>
    ['usage', 'range', deviceId, days] as const,
  usageCategories: (deviceId: string, days: number) =>
    ['usage', 'categories', deviceId, days] as const,
  rules: (params?: Record<string, unknown>) => ['rules', params ?? {}] as const,
  policy: (deviceId: string) => ['rules', 'effective', deviceId] as const,
  progress: (deviceId: string) => ['rules', 'progress', deviceId] as const,
  focusActive: ['focus', 'active'] as const,
  focusHistory: ['focus', 'history'] as const,
  focusStats: ['focus', 'stats'] as const,
  rewards: ['rewards'] as const,
  redemptions: (mine: boolean) => ['rewards', 'redemptions', mine] as const,
  points: ['rewards', 'points'] as const,
  notifications: (unread: boolean) => ['notifications', unread] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

// ---------------------------------------------------------------------------
// Devices & households
// ---------------------------------------------------------------------------

export function useDevices() {
  return useQuery({ queryKey: qk.devices, queryFn: devicesApi.list });
}

export function useDevice(id?: string) {
  return useQuery({
    queryKey: qk.device(id ?? ''),
    queryFn: () => devicesApi.get(id as string),
    enabled: !!id,
  });
}

export function useHouseholds() {
  return useQuery({ queryKey: qk.households, queryFn: householdsApi.list });
}

export function useHousehold(id?: string) {
  return useQuery({
    queryKey: qk.household(id ?? ''),
    queryFn: () => householdsApi.get(id as string),
    enabled: !!id,
  });
}

export function useRegisterDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: devicesApi.register,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices }),
  });
}

export function usePairDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, householdId }: { code: string; householdId?: string }) =>
      devicesApi.pair(code, householdId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices }),
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices }),
  });
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export function useUsageOverview(
  deviceId?: string,
  date?: string,
  options?: Partial<UseQueryOptions<UsageOverview>>,
) {
  return useQuery({
    queryKey: qk.usageOverview(deviceId ?? '', date),
    queryFn: () => usageApi.overview(deviceId as string, date),
    enabled: !!deviceId,
    ...options,
  });
}

export function useUsageApps(deviceId?: string, date?: string) {
  return useQuery({
    queryKey: qk.usageApps(deviceId ?? '', date),
    queryFn: () => usageApi.apps(deviceId as string, date),
    enabled: !!deviceId,
  });
}

export function useUsageRange(deviceId?: string, days = 7) {
  return useQuery({
    queryKey: qk.usageRange(deviceId ?? '', days),
    queryFn: () =>
      usageApi.range(deviceId as string, dateKeyDaysAgo(days - 1), dateKeyDaysAgo(0)),
    enabled: !!deviceId,
    select: (data): DailySeriesPoint[] => data.days,
  });
}

export function useUsageCategories(deviceId?: string, days = 7) {
  return useQuery({
    queryKey: qk.usageCategories(deviceId ?? '', days),
    queryFn: () =>
      usageApi.categories(
        deviceId as string,
        dateKeyDaysAgo(days - 1),
        dateKeyDaysAgo(0),
      ),
    enabled: !!deviceId,
    select: (data): CategoryTotal[] => data,
  });
}

export function useIngestUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngestPayload) => usageApi.ingest(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function useRules(params?: { deviceId?: string; householdId?: string }) {
  return useQuery({
    queryKey: qk.rules(params),
    queryFn: () => rulesApi.list(params),
  });
}

export function useEffectivePolicy(deviceId?: string) {
  return useQuery({
    queryKey: qk.policy(deviceId ?? ''),
    queryFn: () => rulesApi.effective(deviceId as string),
    enabled: !!deviceId,
  });
}

export function useLimitProgress(deviceId?: string) {
  return useQuery({
    queryKey: qk.progress(deviceId ?? ''),
    queryFn: () => rulesApi.progress(deviceId as string),
    enabled: !!deviceId,
    select: (data): LimitProgress[] => data,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) => rulesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      rulesApi.toggle(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rulesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------

export function useActiveFocus() {
  return useQuery({
    queryKey: qk.focusActive,
    queryFn: focusApi.active,
    refetchInterval: 30_000,
  });
}

export function useFocusHistory() {
  return useQuery({ queryKey: qk.focusHistory, queryFn: focusApi.history });
}

export function useFocusStats() {
  return useQuery({ queryKey: qk.focusStats, queryFn: focusApi.stats });
}

export function useStartFocus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: focusApi.start,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['focus'] });
    },
  });
}

export function useStopFocus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => focusApi.stop(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['focus'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCancelFocus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => focusApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['focus'] }),
  });
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export function useRewards(includeInactive = false) {
  return useQuery({
    queryKey: [...qk.rewards, includeInactive] as const,
    queryFn: () => rewardsApi.list(includeInactive),
  });
}

export function useRedemptions(mine = false) {
  return useQuery({
    queryKey: qk.redemptions(mine),
    queryFn: () => rewardsApi.redemptions(mine),
  });
}

export function usePoints() {
  return useQuery({
    queryKey: qk.points,
    queryFn: () => rewardsApi.points(),
    select: (data): Paginated<PointsEntry> => data,
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      rewardsApi.redeem(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rewards'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDecideRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approve,
      note,
    }: {
      id: string;
      approve: boolean;
      note?: string;
    }) => rewardsApi.decide(id, approve, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rewards'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rewardsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rewardsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  });
}

export function useGrantPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      points,
      reason,
      targetUserId,
    }: {
      points: number;
      reason: string;
      targetUserId?: string;
    }) => rewardsApi.grantPoints(points, reason, targetUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rewards'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications(onlyUnread = false) {
  return useQuery({
    queryKey: qk.notifications(onlyUnread),
    queryFn: () => notificationsApi.list(onlyUnread),
    select: (data): AppNotification[] => data,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export type {
  AppUsage,
  Device,
  EffectivePolicy,
  FocusSession,
  Household,
  Redemption,
  Reward,
  Rule,
  UsageOverview,
};
