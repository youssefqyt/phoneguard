/**
 * API DTOs — mirrors the NestJS backend contracts.
 * Keep in sync with `backend/prisma/schema.prisma`.
 */

export type UserRole = 'ADMIN' | 'PARENT' | 'CHILD' | 'ADULT';
export type HouseholdRole = 'OWNER' | 'PARENT' | 'CHILD' | 'VIEWER';
export type MemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';
export type Platform = 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN';
export type DeviceStatus = 'PENDING' | 'PAIRED' | 'REVOKED';
export type RuleType =
  | 'APP_LIMIT'
  | 'CATEGORY_LIMIT'
  | 'BLOCKLIST'
  | 'SCHEDULE'
  | 'BEDTIME';
export type RuleAction = 'BLOCK' | 'WARN' | 'REMIND';
export type FocusStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type RewardType = 'SCREEN_TIME' | 'APP_UNLOCK' | 'PRIVILEGE';
export type RedemptionStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'DENIED'
  | 'FULFILLED'
  | 'EXPIRED';
export type NotificationType =
  | 'LIMIT_REACHED'
  | 'FOCUS_STARTED'
  | 'FOCUS_ENDED'
  | 'REWARD_REQUESTED'
  | 'REWARD_APPROVED'
  | 'REWARD_DENIED'
  | 'DEVICE_PAIRED'
  | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  timezone: string;
  locale: string;
  pointsBalance: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  status: MemberStatus;
  joinedAt: string;
  user?: Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl' | 'role'>;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members?: HouseholdMember[];
  _count?: { devices: number; rules: number; rewards: number };
}

export interface Device {
  id: string;
  ownerId: string;
  householdId: string | null;
  name: string;
  model: string | null;
  manufacturer: string | null;
  platform: Platform;
  osVersion: string | null;
  appVersion: string | null;
  status: DeviceStatus;
  pairingCode: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  lastSyncedAt: string | null;
  isManaged: boolean;
  owner?: Pick<User, 'id' | 'displayName' | 'email'>;
  household?: Pick<Household, 'id' | 'name'>;
  rules?: Rule[];
}

export interface AppUsage {
  packageName: string;
  appName: string | null;
  category: string | null;
  totalSeconds: number;
  launches: number;
}

export interface CategoryTotal {
  category: string;
  totalSeconds: number;
}

export interface DailySeriesPoint {
  date: string;
  screenTimeSeconds: number;
  pickups: number;
  notifications: number;
  focusSeconds: number;
}

export interface UsageOverview {
  date: string;
  screenTimeSeconds: number;
  previousDay: { date: string; screenTimeSeconds: number };
  changePercent: number | null;
  pickups: number;
  notifications: number;
  unlocks: number;
  focusSeconds: number;
  topApps: AppUsage[];
  categories: CategoryTotal[];
  week: DailySeriesPoint[];
}

export interface AppLimitConfig {
  packages: string[];
  dailyLimitMinutes: number;
}
export interface CategoryLimitConfig {
  category: string;
  dailyLimitMinutes: number;
}
export interface BlocklistConfig {
  packages: string[];
}
export interface ScheduleConfig {
  days: number[];
  startTime: string;
  endTime: string;
}

export type RuleConfig =
  | AppLimitConfig
  | CategoryLimitConfig
  | BlocklistConfig
  | ScheduleConfig;

export interface Rule {
  id: string;
  householdId: string | null;
  deviceId: string | null;
  name: string;
  type: RuleType;
  action: RuleAction;
  enabled: boolean;
  priority: number;
  config: RuleConfig;
  createdAt: string;
  updatedAt: string;
  device?: Pick<Device, 'id' | 'name'> | null;
}

export interface LimitProgress {
  id: string;
  deviceId: string;
  ruleId: string;
  packageName: string;
  date: string;
  usedSeconds: number;
  bonusSeconds: number;
  blockedAt: string | null;
}

export interface EffectivePolicy {
  deviceId: string;
  date: string;
  generatedAt: string;
  rules: Rule[];
  progress: LimitProgress[];
}

export interface FocusSession {
  id: string;
  userId: string;
  deviceId: string | null;
  label: string | null;
  plannedMinutes: number;
  startedAt: string;
  endedAt: string | null;
  status: FocusStatus;
  blockedPackages: string[];
  elapsedMinutes?: number;
  completed?: boolean;
  pointsAwarded?: number;
}

export interface Reward {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  type: RewardType;
  pointCost: number;
  valueMinutes: number;
  targetPackage: string | null;
  isActive: boolean;
  icon: string | null;
}

export interface Redemption {
  id: string;
  rewardId: string;
  userId: string;
  status: RedemptionStatus;
  pointCost: number;
  note: string | null;
  createdAt: string;
  reward?: Reward;
  user?: Pick<User, 'id' | 'displayName' | 'email'>;
}

export interface PointsEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
