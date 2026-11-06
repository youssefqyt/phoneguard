import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Button,
  Card,
  PermissionCard,
  Screen,
} from '../../components';
import { useIngestUsage } from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import UsageBridge, { type PlatformCapabilities } from '../../native/UsageBridge';
import { colors, spacing } from '../../theme';
import { todayKey } from '../../utils/format';
import { showAlert } from '../../utils/dialog';

/**
 * Permissions & sync.
 *
 * Android ships a real collector: Usage Access feeds screen-time reporting and
 * the Accessibility service performs enforcement. iOS exposes neither without
 * the Apple-approved Screen Time entitlement, so this screen reports that
 * honestly instead of pretending the capability exists.
 */
export function PermissionsScreen() {
  const { deviceId } = useDeviceSelection();
  const ingest = useIngestUsage();

  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [caps, usageAccess, accessibility] = await Promise.all([
        UsageBridge.getCapabilities(),
        UsageBridge.hasUsageAccess(),
        UsageBridge.hasAccessibility(),
      ]);
      setCapabilities({
        ...caps,
        hasUsagePermission: usageAccess,
        hasAccessibilityPermission: accessibility,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onRequestUsage() {
    await UsageBridge.requestUsageAccess();
    // The system screen does not report back, so re-check on return.
    setTimeout(() => void refresh(), 800);
  }

  async function onRequestAccessibility() {
    await UsageBridge.requestAccessibility();
    setTimeout(() => void refresh(), 800);
  }

  async function onSync() {
    if (!deviceId) {
      showAlert('No device selected', 'Register and pair a device first.');
      return;
    }
    const date = todayKey();
    try {
      const collection = await UsageBridge.queryUsage(date);
      if (collection.apps.length === 0) {
        showAlert(
          'Nothing to sync',
          UsageBridge.isAvailable()
            ? 'The device reported no app usage for today yet.'
            : 'Usage collection is not available in this build.',
        );
        return;
      }
      const result = await ingest.mutateAsync({
        deviceId,
        date,
        apps: collection.apps.map(app => ({
          packageName: app.packageName,
          appName: app.appName ?? undefined,
          totalSeconds: app.totalSeconds,
          launches: app.launches,
        })),
        summary: {
          screenTimeSeconds: collection.summary.screenTimeSeconds,
          pickups: collection.summary.pickups,
          notifications: collection.summary.notifications,
          unlocks: collection.summary.unlocks,
        },
      });
      setLastSync(`${result.accepted} app(s) uploaded for ${date}`);
    } catch (err) {
      showAlert(
        'Sync failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  const caps = capabilities;
  const nativeAvailable = UsageBridge.isAvailable();

  return (
    <Screen
      title="Permissions"
      subtitle={`${Platform.OS === 'web' ? 'Web browser' : Platform.OS === 'ios' ? 'iOS' : 'Android'} · v1.0.0`}
      headerRight={
        <Button
          label="Re-check"
          size="sm"
          variant="secondary"
          fullWidth={false}
          loading={refreshing}
          onPress={() => void refresh()}
        />
      }
    >
      {Platform.OS === 'web' ? (
        <Card title="Browser limitations">
          <AppText variant="caption" tone="muted" style={styles.syncHelp}>
            Browser security does not allow PhoneGuard to inspect installed
            apps, read device screen time, or enforce app blocks. The web app
            manages your account and family data; use the Android app for
            device-level collection and controls.
          </AppText>
        </Card>
      ) : null}

      <PermissionCard
        title="Usage access"
        description="Reads per-app screen time, launches and pickups so the dashboard and limits have data to work with."
        granted={!!caps?.hasUsagePermission}
        unavailableReason={
          !nativeAvailable ? caps?.reason : undefined
        }
        actionLabel="Open Usage Access"
        onRequest={() => void onRequestUsage()}
      />

      <PermissionCard
        title="App blocking (Accessibility)"
        description="Lets PhoneGuard stop you opening a blocked app or an app that has hit its daily limit."
        granted={!!caps?.hasAccessibilityPermission}
        unavailableReason={
          !nativeAvailable ? caps?.reason : undefined
        }
        actionLabel="Open Accessibility"
        onRequest={() => void onRequestAccessibility()}
      />

      <Card title="Capabilities" subtitle="What this build can do">
        <View style={styles.row}>
          <AppText variant="body" style={styles.rowLabel}>
            Read usage
          </AppText>
          <AppText
            variant="label"
            tone={caps?.canReadUsage ? 'success' : 'faint'}
          >
            {caps?.canReadUsage ? 'Supported' : 'Not supported'}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="body" style={styles.rowLabel}>
            Block apps
          </AppText>
          <AppText
            variant="label"
            tone={caps?.canBlockApps ? 'success' : 'faint'}
          >
            {caps?.canBlockApps ? 'Supported' : 'Not supported'}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="body" style={styles.rowLabel}>
            Screen Time entitlement
          </AppText>
          <AppText
            variant="label"
            tone={caps?.requiresScreenTimeEntitlement ? 'warning' : 'faint'}
          >
            {caps?.requiresScreenTimeEntitlement ? 'Required' : 'Not needed'}
          </AppText>
        </View>
      </Card>

      <Card title="Sync usage" subtitle="Push today's numbers to the server">
        <AppText variant="caption" tone="muted" style={styles.syncHelp}>
          {nativeAvailable
            ? 'The collector normally flushes every 5 minutes in the background. Use this to sync immediately.'
            : 'Background collection is unavailable in this build, so there is nothing to upload from here.'}
        </AppText>
        {lastSync ? (
          <AppText variant="caption" tone="success" style={styles.syncHelp}>
            Last sync: {lastSync}
          </AppText>
        ) : null}
        <Button
          label="Sync now"
          variant="secondary"
          loading={ingest.isPending}
          disabled={!deviceId || Platform.OS === 'web'}
          onPress={() => void onSync()}
        />
      </Card>

      <AppText variant="caption" tone="faint" style={styles.footnote}>
        PhoneGuard never reads message content or keystrokes. Usage Access and
        Accessibility are used only to measure per-app time and to close apps
        that exceed a limit you configured.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowLabel: {
    flex: 1,
    marginRight: spacing.sm,
  },
  syncHelp: {
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  footnote: {
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
