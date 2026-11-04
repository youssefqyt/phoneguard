import { useEffect, useMemo } from 'react';
import { useDevices } from '../api/hooks';
import { useSettingsStore } from '../store/settingsStore';
import type { Device } from '../api/types';

export interface DeviceSelection {
  devices: Device[];
  device: Device | null;
  deviceId: string | null;
  setDeviceId: (id: string) => void;
  isLoading: boolean;
  selectable: Device[];
}

/**
 * Resolves the device the dashboard screens should operate on.
 *
 * Preference order:
 *   1. the device the user last selected (persisted)
 *   2. the first managed (child) device
 *   3. the first device at all
 */
export function useDeviceSelection(): DeviceSelection {
  const { data: devices, isLoading } = useDevices();
  const selectedDeviceId = useSettingsStore(state => state.selectedDeviceId);
  const selectDevice = useSettingsStore(state => state.selectDevice);

  const list = useMemo(() => devices ?? [], [devices]);

  // Most useful default: a device that is actually managed and paired.
  const selectable = useMemo(
    () => list.filter(d => d.status === 'PAIRED'),
    [list],
  );

  const fallback = useMemo(() => {
    const managed = selectable.find(d => d.isManaged);
    return managed ?? selectable[0] ?? list[0] ?? null;
  }, [selectable, list]);

  useEffect(() => {
    if (!selectedDeviceId && fallback) {
      void selectDevice(fallback.id);
    }
  }, [selectedDeviceId, fallback, selectDevice]);

  const deviceId = selectedDeviceId ?? fallback?.id ?? null;
  const device = useMemo(
    () => list.find(d => d.id === deviceId) ?? null,
    [list, deviceId],
  );

  return { devices: list, device, deviceId, setDeviceId: selectDevice, isLoading, selectable };
}
