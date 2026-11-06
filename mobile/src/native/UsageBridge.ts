import { NativeModules, Platform } from 'react-native';

/**
 * Cross-platform bridge to the native usage / enforcement modules.
 *
 * Android ships a real implementation (`PhoneGuardModule` in Kotlin) backed by
 * `UsageStatsManager` and an `AccessibilityService`.
 *
 * iOS has no general-purpose equivalent — Apple only exposes Screen Time via
 * the Family Controls entitlement. When the native module is absent (iOS, or a
 * simulator build) every call degrades to a safe no-op so the UI keeps working.
 */

export interface AppInstallInfo {
  packageName: string;
  appName: string;
  category?: string | null;
  isSystem: boolean;
}

export interface UsageStat {
  packageName: string;
  appName?: string | null;
  totalSeconds: number;
  launches: number;
  lastUsedAt?: number | null;
}

export interface DeviceUsageSummary {
  screenTimeSeconds: number;
  pickups: number;
  notifications: number;
  unlocks: number;
  firstUnlockAt?: number | null;
}

export interface UsageCollection {
  date: string;
  apps: UsageStat[];
  summary: DeviceUsageSummary;
}

export interface PlatformCapabilities {
  canReadUsage: boolean;
  canBlockApps: boolean;
  hasUsagePermission: boolean;
  hasAccessibilityPermission: boolean;
  requiresScreenTimeEntitlement: boolean;
  reason?: string;
}

export interface BlockTarget {
  packageName: string;
  /** Optional human label shown on the block screen. */
  appName?: string;
  /** Remaining allowance, used to phrase the message. */
  reason?: string;
}

interface PhoneGuardNativeModule {
  /** Opens the system Usage Access settings screen. */
  requestUsageAccess(): Promise<boolean>;
  hasUsageAccess(): Promise<boolean>;
  /** Opens the Accessibility settings screen. */
  requestAccessibility(): Promise<boolean>;
  hasAccessibility(): Promise<boolean>;
  getInstalledApps(): Promise<AppInstallInfo[]>;
  queryUsage(dateKey: string): Promise<UsageCollection>;
  setBlockedApps(packages: string[]): Promise<boolean>;
  setSchedule(payload: {
    days: number[];
    startTime: string;
    endTime: string;
    packages: string[];
  }): Promise<boolean>;
  clearEnforcement(): Promise<boolean>;
  getCapabilities(): Promise<PlatformCapabilities>;
}

const native = NativeModules.PhoneGuard as PhoneGuardNativeModule | undefined;

/** True when the full Android implementation is available. */
export const isNativeAvailable = Platform.OS === 'android' && !!native;

const unavailableCapabilities: PlatformCapabilities = {
  canReadUsage: false,
  canBlockApps: false,
  hasUsagePermission: false,
  hasAccessibilityPermission: false,
  requiresScreenTimeEntitlement: Platform.OS === 'ios',
  reason:
    Platform.OS === 'web'
      ? 'Browser builds cannot read device usage or enforce app blocks. Use the Android app for device-level collection and controls.'
      : Platform.OS === 'ios'
      ? 'iOS requires the Screen Time (Family Controls) entitlement, which must be approved by Apple. Usage tracking and app blocking are unavailable in this build.'
      : 'The native PhoneGuard module is not available in this build.',
};

function emptyCollection(dateKey: string): UsageCollection {
  return {
    date: dateKey,
    apps: [],
    summary: {
      screenTimeSeconds: 0,
      pickups: 0,
      notifications: 0,
      unlocks: 0,
    },
  };
}

export const UsageBridge = {
  isAvailable(): boolean {
    return isNativeAvailable;
  },

  async getCapabilities(): Promise<PlatformCapabilities> {
    if (!native) return unavailableCapabilities;
    try {
      return await native.getCapabilities();
    } catch {
      return unavailableCapabilities;
    }
  },

  async hasUsageAccess(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.hasUsageAccess();
    } catch {
      return false;
    }
  },

  async requestUsageAccess(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.requestUsageAccess();
    } catch {
      return false;
    }
  },

  async hasAccessibility(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.hasAccessibility();
    } catch {
      return false;
    }
  },

  async requestAccessibility(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.requestAccessibility();
    } catch {
      return false;
    }
  },

  async getInstalledApps(): Promise<AppInstallInfo[]> {
    if (!native) return [];
    try {
      return await native.getInstalledApps();
    } catch {
      return [];
    }
  },

  async queryUsage(dateKey: string): Promise<UsageCollection> {
    if (!native) return emptyCollection(dateKey);
    try {
      return await native.queryUsage(dateKey);
    } catch {
      return emptyCollection(dateKey);
    }
  },

  /** Applies the blocked set to the accessibility service. */
  async setBlockedApps(packages: string[]): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.setBlockedApps(packages);
    } catch {
      return false;
    }
  },

  /** Applies a recurring schedule window (days are ISO weekdays 1–7). */
  async setSchedule(payload: {
    days: number[];
    startTime: string;
    endTime: string;
    packages: string[];
  }): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.setSchedule(payload);
    } catch {
      return false;
    }
  },

  async clearEnforcement(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.clearEnforcement();
    } catch {
      return false;
    }
  },
};

export default UsageBridge;
