import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
} from '../../components';
import { SwitchRow } from '../../components/Controls';
import {
  useDeleteRule,
  useLimitProgress,
  useRules,
  useToggleRule,
} from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import type { LimitProgress, Rule, RuleConfig } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { showAlert } from '../../utils/dialog';
import { formatDuration, minutesToTime } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RULE_LABELS: Record<Rule['type'], string> = {
  APP_LIMIT: 'App limit',
  CATEGORY_LIMIT: 'Category cap',
  BLOCKLIST: 'Blocklist',
  SCHEDULE: 'Schedule',
  BEDTIME: 'Bedtime',
};

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function describeRule(rule: Rule): string {
  const config = rule.config as Partial<
    RuleConfig & { days?: number[]; startTime?: string; endTime?: string; dailyLimitMinutes?: number; packages?: string[]; category?: string }
  >;

  switch (rule.type) {
    case 'APP_LIMIT':
      return `${config.packages?.length ?? 0} app(s) · ${formatDuration(
        (config.dailyLimitMinutes ?? 0) * 60,
      )}/day`;
    case 'CATEGORY_LIMIT':
      return `${config.category ?? 'Category'} · ${formatDuration(
        (config.dailyLimitMinutes ?? 0) * 60,
      )}/day`;
    case 'BLOCKLIST':
      return `${config.packages?.length ?? 0} app(s) blocked`;
    case 'SCHEDULE':
    case 'BEDTIME':
      return `${config.startTime ?? '--:--'} – ${config.endTime ?? '--:--'} · ${
        config.days?.length ?? 0
      } day(s)`;
    default:
      return '';
  }
}

function isLimitRule(rule: Rule): boolean {
  return rule.type === 'APP_LIMIT' || rule.type === 'CATEGORY_LIMIT';
}

export function LimitsScreen() {
  const navigation = useNavigation<Nav>();
  const { device, deviceId, selectable, setDeviceId } = useDeviceSelection();

  const rules = useRules(deviceId ? { deviceId } : undefined);
  const progress = useLimitProgress(deviceId ?? undefined);
  const toggleRule = useToggleRule();
  const deleteRule = useDeleteRule();

  const progressByPackage = useMemo(() => {
    const map = new Map<string, LimitProgress>();
    for (const entry of progress.data ?? []) {
      map.set(`${entry.ruleId}:${entry.packageName}`, entry);
    }
    return map;
  }, [progress.data]);

  const deviceRules = useMemo(
    () => (rules.data ?? []).filter(r => !deviceId || r.deviceId === deviceId || r.deviceId === null),
    [rules.data, deviceId],
  );

  function confirmDelete(rule: Rule) {
    showAlert(
      'Delete rule',
      `“${rule.name}” will be removed for everyone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRule.mutate(rule.id),
        },
      ],
    );
  }

  return (
    <Screen
      title="Limits"
      subtitle={device ? device.name : 'Choose a device'}
      headerRight={
        <Button
          label="New rule"
          size="sm"
          fullWidth={false}
          onPress={() =>
            navigation.navigate('RuleEditor', {
              deviceId: deviceId ?? undefined,
            })
          }
        />
      }
    >
      {selectable.length > 1 ? (
        <View style={styles.devicePicker}>
          {selectable.map(d => {
            const active = d.id === deviceId;
            return (
              <Button
                key={d.id}
                label={d.name}
                size="sm"
                fullWidth={false}
                variant={active ? 'primary' : 'secondary'}
                onPress={() => setDeviceId(d.id)}
              />
            );
          })}
        </View>
      ) : null}

      {rules.isLoading ? (
        <LoadingState label="Loading rules…" />
      ) : deviceRules.length === 0 ? (
        <EmptyState
          icon="⏳"
          title="No limits yet"
          message="Create an app limit, blocklist or schedule to start shaping screen time."
          action={
            <Button
              label="Create your first rule"
              onPress={() =>
                navigation.navigate('RuleEditor', {
                  deviceId: deviceId ?? undefined,
                })
              }
            />
          }
        />
      ) : (
        deviceRules.map(rule => (
          <Card key={rule.id}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleTitle}>
                <AppText variant="heading">{rule.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {describeRule(rule)}
                </AppText>
              </View>
              <Badge
                label={RULE_LABELS[rule.type]}
                color={rule.enabled ? colors.primary : colors.textFaint}
              />
            </View>

            {rule.type === 'SCHEDULE' || rule.type === 'BEDTIME' ? (
              <View style={styles.days}>
                {WEEKDAY_INITIALS.map((initial, index) => {
                  const days = (rule.config as { days?: number[] }).days ?? [];
                  const active = days.includes(index + 1);
                  return (
                    <View
                      key={`${initial}-${index}`}
                      style={[styles.day, active ? styles.dayActive : null]}
                    >
                      <AppText
                        variant="tiny"
                        color={active ? colors.text : colors.textFaint}
                      >
                        {initial}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {isLimitRule(rule)
              ? (progress.data ?? [])
                  .filter(p => p.ruleId === rule.id)
                  .slice(0, 4)
                  .map(entry => {
                    const limitMinutes = (
                      rule.config as { dailyLimitMinutes?: number }
                    ).dailyLimitMinutes ?? 0;
                    const limitSeconds = limitMinutes * 60;
                    const used = entry.usedSeconds + entry.bonusSeconds;
                    const ratio = limitSeconds > 0 ? used / limitSeconds : 0;
                    const exceeded = ratio >= 1;
                    return (
                      <View key={entry.id} style={styles.progressRow}>
                        <AppText variant="caption" style={styles.progressLabel}>
                          {entry.packageName.replace('category:', '')}
                        </AppText>
                        <View style={styles.progressRight}>
                          <AppText
                            variant="caption"
                            tone={exceeded ? 'danger' : 'muted'}
                          >
                            {formatDuration(used)} / {formatDuration(limitSeconds)}
                          </AppText>
                          {exceeded ? (
                            <AppText variant="tiny" tone="danger">
                              BLOCKED
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
              : null}

            <SwitchRow
              label="Enabled"
              value={rule.enabled}
              onValueChange={enabled =>
                toggleRule.mutate({ id: rule.id, enabled })
              }
            />

            <View style={styles.ruleActions}>
              <Button
                label="Edit"
                size="sm"
                variant="secondary"
                fullWidth={false}
                onPress={() =>
                  navigation.navigate('RuleEditor', { ruleId: rule.id })
                }
              />
              <Button
                label="Delete"
                size="sm"
                variant="danger"
                fullWidth={false}
                onPress={() => confirmDelete(rule)}
              />
            </View>
          </Card>
        ))
      )}

      <Button
        label="Refresh limit counters"
        variant="secondary"
        onPress={() => void progress.refetch()}
      />

      <AppText variant="caption" tone="faint" style={styles.footnote}>
        {progressByPackage.size > 0
          ? `${progressByPackage.size} limit counter(s) tracked today.`
          : 'Limit counters appear here once the device reports usage.'}{' '}
        Schedule windows use the device clock, where {minutesToTime(0)} is midnight.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  devicePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ruleTitle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: spacing.sm,
  },
  day: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  dayActive: {
    backgroundColor: colors.primarySoft,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  progressLabel: {
    flex: 1,
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  ruleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footnote: {
    marginTop: spacing.md,
    lineHeight: 16,
    paddingHorizontal: spacing.xs,
  },
});
