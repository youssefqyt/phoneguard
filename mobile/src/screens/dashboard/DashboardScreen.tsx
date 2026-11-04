import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  BarChart,
  Card,
  CategoryBreakdown,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  ProgressBar,
  Screen,
  StatRow,
  StatTile,
} from '../../components';
import { useUnreadCount, useUsageOverview } from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';
import { categoryColor, colors, radii, spacing } from '../../theme';
import { formatDuration, formatDateKey, packageToName } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** A soft daily target used to give the hero metric a sense of scale. */
const DAILY_TARGET_SECONDS = 4 * 60 * 60;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const { device, deviceId, selectable, setDeviceId, isLoading: devicesLoading } =
    useDeviceSelection();

  const overview = useUsageOverview(deviceId ?? undefined, undefined, {
    refetchInterval: 60_000,
  });
  const unread = useUnreadCount();

  const weekData = useMemo(
    () =>
      (overview.data?.week ?? []).map(point => ({
        label: formatDateKey(point.date, 'dd'),
        value: Math.round(point.screenTimeSeconds / 60),
      })),
    [overview.data],
  );

  const categories = useMemo(
    () =>
      (overview.data?.categories ?? []).map(item => ({
        category: item.category,
        value: item.totalSeconds,
        color: categoryColor(item.category),
      })),
    [overview.data],
  );

  if (devicesLoading) {
    return (
      <Screen scroll={false} title="Overview">
        <LoadingState label="Finding your devices…" />
      </Screen>
    );
  }

  if (!deviceId) {
    return (
      <Screen title="Overview">
        <EmptyState
          icon="📱"
          title="No device yet"
          message="Register a device from the Family tab to start collecting screen-time data."
        />
      </Screen>
    );
  }

  const change = overview.data?.changePercent;
  const screenTime = overview.data?.screenTimeSeconds ?? 0;

  return (
    <Screen
      title={`Hi, ${user?.displayName?.split(' ')[0] ?? 'there'}`}
      subtitle={device ? `${device.name} · today` : 'Today'}
      headerRight={
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
          >
            <AppText variant="body">🔔</AppText>
            {(unread.data ?? 0) > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconButton}
            accessibilityLabel="Settings"
          >
            <AppText variant="body">⚙️</AppText>
          </Pressable>
        </View>
      }
    >
      {selectable.length > 1 ? (
        <View style={styles.devicePicker}>
          {selectable.map(d => {
            const active = d.id === deviceId;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDeviceId(d.id)}
                style={[styles.deviceChip, active ? styles.deviceChipActive : null]}
              >
                <AppText variant="label" tone={active ? 'default' : 'muted'}>
                  {d.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {overview.isError ? (
        <ErrorState
          message={
            overview.error instanceof Error
              ? overview.error.message
              : 'Could not load usage.'
          }
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      <Card style={styles.hero}>
        <AppText variant="tiny" tone="faint">
          SCREEN TIME TODAY
        </AppText>
        <AppText variant="display" style={styles.heroValue}>
          {formatDuration(screenTime)}
        </AppText>
        {change !== null && change !== undefined ? (
          <AppText
            variant="caption"
            tone={change > 0 ? 'warning' : 'success'}
            style={styles.heroDelta}
          >
            {change > 0 ? `▲ ${change}%` : `▼ ${Math.abs(change)}%`} vs yesterday
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            No comparison for yesterday yet
          </AppText>
        )}
        <ProgressBar
          value={screenTime / DAILY_TARGET_SECONDS}
          color={screenTime > DAILY_TARGET_SECONDS ? colors.warning : colors.primary}
          style={styles.heroBar}
          label={`of ${formatDuration(DAILY_TARGET_SECONDS)}`}
        />
      </Card>

      <StatRow>
        <StatTile label="Pickups" value={String(overview.data?.pickups ?? 0)} />
        <StatTile label="Unlocks" value={String(overview.data?.unlocks ?? 0)} />
        <StatTile
          label="Focus"
          value={formatDuration(overview.data?.focusSeconds ?? 0)}
          tone="success"
        />
      </StatRow>

      <Card title="This week" subtitle="Screen time per day">
        {weekData.length > 0 ? (
          <BarChart
            data={weekData}
            formatValue={value => formatDuration(value * 60)}
          />
        ) : (
          <AppText variant="caption" tone="muted">
            No data for this week yet.
          </AppText>
        )}
      </Card>

      <Card title="By category" subtitle="Last 7 days">
        <CategoryBreakdown
          data={categories}
          formatValue={value => formatDuration(value)}
        />
      </Card>

      <Card title="Top apps today">
        {overview.isLoading ? (
          <LoadingState />
        ) : (overview.data?.topApps.length ?? 0) === 0 ? (
          <AppText variant="caption" tone="muted">
            No app usage recorded today.
          </AppText>
        ) : (
          overview.data?.topApps.map(app => (
            <ListRow
              key={app.packageName}
              title={app.appName ?? packageToName(app.packageName)}
              subtitle={`${app.launches} launches`}
              leading="📱"
              leadingColor={colors.surfaceAlt}
              trailing={
                <AppText variant="label" tone="muted">
                  {formatDuration(app.totalSeconds)}
                </AppText>
              }
              onPress={() =>
                navigation.navigate('AppDetail', {
                  deviceId,
                  packageName: app.packageName,
                  appName: app.appName ?? undefined,
                })
              }
            />
          ))
        )}
      </Card>

      <Card title="Quick actions">
        <ListRow
          title="Set an app limit"
          subtitle="Cap daily time for a specific app"
          leading="⏳"
          onPress={() => navigation.navigate('RuleEditor', { deviceId })}
        />
        <ListRow
          title="Start a focus session"
          subtitle="Block distractions for a while"
          leading="🎯"
          onPress={() => navigation.navigate('Tabs', { screen: 'Focus' })}
        />
        <ListRow
          title="Check permissions"
          subtitle="Usage access and app blocking"
          leading="🔐"
          onPress={() => navigation.navigate('Permissions')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  devicePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  deviceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  deviceChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  hero: {
    paddingVertical: spacing.xl,
  },
  heroValue: {
    marginTop: spacing.xs,
  },
  heroDelta: {
    marginTop: spacing.xs,
  },
  heroBar: {
    marginTop: spacing.lg,
  },
});
