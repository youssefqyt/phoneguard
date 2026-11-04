import { create } from 'zustand';
import { StorageKeys, getItem, setItem } from '../utils/storage';

interface SettingsState {
  /** Device currently selected for the dashboard/limits screens. */
  selectedDeviceId: string | null;
  /** Whether the local usage collector is running. */
  collectorEnabled: boolean;
  onboardingComplete: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  selectDevice: (deviceId: string | null) => Promise<void>;
  setCollectorEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>(set => ({
  selectedDeviceId: null,
  collectorEnabled: true,
  onboardingComplete: false,
  hydrated: false,

  async hydrate() {
    const [selectedDeviceId, onboardingComplete] = await Promise.all([
      getItem<string>(StorageKeys.deviceId),
      getItem<boolean>(StorageKeys.onboardingComplete),
    ]);
    set({
      selectedDeviceId: selectedDeviceId ?? null,
      onboardingComplete: onboardingComplete ?? false,
      hydrated: true,
    });
  },

  async selectDevice(deviceId) {
    set({ selectedDeviceId: deviceId });
    if (deviceId) await setItem(StorageKeys.deviceId, deviceId);
  },

  async setCollectorEnabled(enabled) {
    set({ collectorEnabled: enabled });
    await setItem('settings.collector', enabled);
  },

  async completeOnboarding() {
    set({ onboardingComplete: true });
    await setItem(StorageKeys.onboardingComplete, true);
  },
}));

/** Convenience selector used across screens. */
export function useSelectedDeviceId(): string | null {
  return useSettingsStore(state => state.selectedDeviceId);
}

export function useSettingsLoaded(): boolean {
  return useSettingsStore(state => state.hydrated);
}

export function isHydrated(): boolean {
  return useSettingsStore.getState().hydrated;
}
