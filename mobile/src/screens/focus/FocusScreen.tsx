import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Field,
  ListRow,
  Screen,
  StatRow,
  StatTile,
} from '../../components';
import {
  useActiveFocus,
  useCancelFocus,
  useFocusHistory,
  useFocusStats,
  useRules,
  useStartFocus,
  useStopFocus,
} from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import UsageBridge from '../../native/UsageBridge';
import { colors, spacing } from '../../theme';
import { formatCountdown, formatDateKey, formatMinutes } from '../../utils/format';
import { showAlert } from '../../utils/dialog';

const DURATIONS = [15, 25, 45, 60, 90];

/**
 * Focus mode. When a session starts the app pushes the blocked-app set to the
 * native enforcement layer so the OS itself keeps distractors away.
 */
export function FocusScreen() {
  const { deviceId } = useDeviceSelection();
  const active = useActiveFocus();
  const history = useFocusHistory();
  const stats = useFocusStats();
  const rules = useRules(deviceId ? { deviceId } : undefined);

  const startFocus = useStartFocus();
  const stopFocus = useStopFocus();
  const cancelFocus = useCancelFocus();

  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [label, setLabel] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const session = active.data ?? null;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick once a second while a session is running.
  useEffect(() => {
    if (!session) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  /** Packages to block: everything the rules already target. */
  const blockedPackages = useMemo(() => {
    const packages = new Set<string>();
    for (const rule of rules.data ?? []) {
      const config = rule.config as { packages?: string[] };
      if (Array.isArray(config.packages)) {
        config.packages.forEach(p => packages.add(p));
      }
    }
    return Array.from(packages);
  }, [rules.data]);

  const remainingMs = session
    ? session.startedAt
      ? Math.max(
          0,
          new Date(session.startedAt).getTime() +
            session.plannedMinutes * 60_000 -
            now,
        )
      : 0
    : 0;

  async function onStart() {
    try {
      await startFocus.mutateAsync({
        plannedMinutes,
        label: label.trim() || undefined,
        deviceId: deviceId ?? undefined,
        blockedPackages,
      });
      if (blockedPackages.length > 0) {
        await UsageBridge.setBlockedApps(blockedPackages);
      }
    } catch (err) {
      showAlert(
        'Could not start',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onStop() {
    if (!session) return;
    try {
      const result = await stopFocus.mutateAsync(session.id);
      await UsageBridge.clearEnforcement();
      if (result?.pointsAwarded) {
        showAlert('Focus complete', `You earned ${result.pointsAwarded} points 🎉`);
      }
    } catch (err) {
      showAlert(
        'Could not stop',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onCancel() {
    if (!session) return;
    showAlert('Cancel session', 'Your progress will not count.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Cancel session',
        style: 'destructive',
        onPress: () => {
          cancelFocus.mutate(session.id);
          void UsageBridge.clearEnforcement();
        },
      },
    ]);
  }

  return (
    <Screen
      title="Focus"
      subtitle={
        Platform.OS === 'web'
          ? 'Use a focus timer. Browser builds cannot block apps on a device.'
          : 'Block distractions for a set time.'
      }
    >
      <StatRow>
        <StatTile
          label="Sessions"
          value={String(stats.data?.completedSessions ?? 0)}
        />
        <StatTile
          label="Total focus"
          value={formatMinutes(stats.data?.totalMinutes ?? 0)}
          tone="success"
        />
      </StatRow>

      {session ? (
        <Card style={styles.activeCard}>
          <AppText variant="tiny" tone="faint">
            {session.status === 'ACTIVE' ? 'IN PROGRESS' : session.status}
          </AppText>
          <AppText variant="display" style={styles.countdown}>
            {formatCountdown(remainingMs)}
          </AppText>
          <AppText variant="body" tone="muted">
            {session.label ?? 'Focus session'} · {session.plannedMinutes} min
          </AppText>

          {blockedPackages.length > 0 ? (
            <AppText variant="caption" tone="faint" style={styles.blocked}>
              {Platform.OS === 'web'
                ? 'Blocking is only enforced by the Android app.'
                : `${blockedPackages.length} app(s) blocked while this runs`}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Finish early"
              onPress={() => void onStop()}
              loading={stopFocus.isPending}
              style={styles.actionButton}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => void onCancel()}
            />
          </View>
        </Card>
      ) : (
        <Card title="Start a session">
          <View style={styles.chips}>
            {DURATIONS.map(minutes => (
              <Button
                key={minutes}
                label={`${minutes}m`}
                size="sm"
                fullWidth={false}
                variant={plannedMinutes === minutes ? 'primary' : 'secondary'}
                onPress={() => setPlannedMinutes(minutes)}
              />
            ))}
          </View>
          <Field
            label="What are you focusing on?"
            value={label}
            onChangeText={setLabel}
            placeholder="Study session"
          />
          <Button
            label={`Start ${plannedMinutes}-minute focus`}
            onPress={() => void onStart()}
            loading={startFocus.isPending}
          />
          <AppText variant="caption" tone="faint" style={styles.hint}>
            {blockedPackages.length > 0
              ? Platform.OS === 'web'
                ? `${blockedPackages.length} app(s) are listed in your rules, but browser builds cannot enforce blocks.`
                : `${blockedPackages.length} app(s) from your rules will be blocked.`
              : 'Add an app limit first to have apps blocked automatically.'}
          </AppText>
        </Card>
      )}

      <Card title="Recent sessions">
        {(history.data ?? []).length === 0 ? (
          <AppText variant="caption" tone="muted">
            No sessions yet.
          </AppText>
        ) : (
          (history.data ?? []).slice(0, 8).map(item => (
            <ListRow
              key={item.id}
              title={item.label ?? 'Focus session'}
              subtitle={`${formatDateKey(item.startedAt, 'ddd D MMM · HH:mm')} · ${
                item.plannedMinutes
              } min`}
              leading={item.status === 'COMPLETED' ? '✅' : '⏹️'}
              leadingColor={colors.surfaceAlt}
              trailing={
                <AppText
                  variant="tiny"
                  tone={item.status === 'COMPLETED' ? 'success' : 'faint'}
                >
                  {item.status}
                </AppText>
              }
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  countdown: {
    marginVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  blocked: {
    marginTop: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
