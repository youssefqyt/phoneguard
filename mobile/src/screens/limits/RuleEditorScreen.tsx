import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppText,
  Button,
  Card,
  Field,
  ListRow,
  Screen,
  Segmented,
} from '../../components';
import { useCreateRule, useHouseholds, useRules } from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import UsageBridge, { type AppInstallInfo } from '../../native/UsageBridge';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { formatMinutes } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'RuleEditor'>;
type EditorType = 'APP_LIMIT' | 'CATEGORY_LIMIT' | 'BLOCKLIST' | 'SCHEDULE';

const CATEGORIES = [
  'SOCIAL',
  'ENTERTAINMENT',
  'GAMES',
  'VIDEO',
  'PRODUCTIVITY',
  'EDUCATION',
  'COMMUNICATION',
  'SHOPPING',
];

const LIMIT_PRESETS = [15, 30, 45, 60, 90, 120];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function RuleEditorScreen({ route, navigation }: Props) {
  const initialDeviceId = route.params?.deviceId;
  const { deviceId: selectedDeviceId } = useDeviceSelection();
  const deviceId = initialDeviceId ?? selectedDeviceId ?? undefined;

  const households = useHouseholds();
  const existing = useRules(deviceId ? { deviceId } : undefined);
  const createRule = useCreateRule();

  const [type, setType] = useState<EditorType>('APP_LIMIT');
  const [name, setName] = useState('');
  const [limitMinutes, setLimitMinutes] = useState(30);
  const [category, setCategory] = useState('SOCIAL');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('07:00');

  const [installed, setInstalled] = useState<AppInstallInfo[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [manualPackage, setManualPackage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const householdId = households.data?.[0]?.id;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const apps = await UsageBridge.getInstalledApps();
      if (!cancelled) setInstalled(apps);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reuse the app picker list to also offer apps that already have usage data.
  const suggestions = useMemo(() => {
    const known = new Set(installed.map(a => a.packageName));
    const fromRules = (existing.data ?? []).flatMap(rule =>
      Array.isArray((rule.config as { packages?: string[] }).packages)
        ? ((rule.config as { packages?: string[] }).packages as string[])
        : [],
    );
    const extras = Array.from(new Set(fromRules)).filter(p => !known.has(p));
    return [
      ...installed,
      ...extras.map(packageName => ({
        packageName,
        appName: packageName,
        isSystem: false,
      })),
    ];
  }, [installed, existing.data]);

  function togglePackage(packageName: string) {
    setSelectedPackages(current =>
      current.includes(packageName)
        ? current.filter(p => p !== packageName)
        : [...current, packageName],
    );
  }

  function toggleDay(day: number) {
    setDays(current =>
      current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  async function onSave() {
    setError(null);

    if (!deviceId && !householdId) {
      setError('Add a device first — rules apply to a device or household.');
      return;
    }

    const packages =
      type === 'BLOCKLIST' || type === 'APP_LIMIT'
        ? selectedPackages
        : undefined;

    if ((type === 'APP_LIMIT' || type === 'BLOCKLIST') && (packages?.length ?? 0) === 0) {
      setError('Pick at least one app.');
      return;
    }

    if (type === 'SCHEDULE') {
      if (days.length === 0) {
        setError('Pick at least one day.');
        return;
      }
      if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        setError('Times must look like 22:00.');
        return;
      }
    }

    const config =
      type === 'APP_LIMIT'
        ? { packages: packages ?? [], dailyLimitMinutes: limitMinutes }
        : type === 'CATEGORY_LIMIT'
          ? { category, dailyLimitMinutes: limitMinutes }
          : type === 'BLOCKLIST'
            ? { packages: packages ?? [] }
            : {
                days,
                startTime,
                endTime,
              };

    try {
      await createRule.mutateAsync({
        deviceId,
        householdId: deviceId ? undefined : householdId,
        name: name.trim() || defaultName(type),
        type,
        config,
        action: type === 'SCHEDULE' ? 'BLOCK' : 'BLOCK',
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the rule.');
    }
  }

  return (
    <Screen scroll title="New rule" subtitle="Limits apply to the selected device.">
      <Segmented<EditorType>
        value={type}
        onChange={setType}
        options={[
          { value: 'APP_LIMIT', label: 'App limit' },
          { value: 'CATEGORY_LIMIT', label: 'Category' },
          { value: 'BLOCKLIST', label: 'Block' },
          { value: 'SCHEDULE', label: 'Schedule' },
        ]}
      />

      <Field
        label="Rule name"
        value={name}
        onChangeText={setName}
        placeholder={defaultName(type)}
      />

      {type === 'APP_LIMIT' || type === 'BLOCKLIST' ? (
        <Card title="Apps" subtitle="Tap to select">
          {suggestions.length === 0 ? (
            <AppText variant="caption" tone="muted">
              No apps detected. Usage access may not be granted yet — you can
              add a package name below.
            </AppText>
          ) : (
            suggestions.slice(0, 40).map(app => {
              const selected = selectedPackages.includes(app.packageName);
              return (
                <ListRow
                  key={app.packageName}
                  title={app.appName}
                  subtitle={app.packageName}
                  leading={selected ? '✓' : '•'}
                  leadingColor={selected ? colors.primarySoft : colors.surfaceAlt}
                  onPress={() => togglePackage(app.packageName)}
                />
              );
            })
          )}

          <Field
            label="Add by package name"
            value={manualPackage}
            onChangeText={setManualPackage}
            placeholder="com.example.app"
            autoCapitalize="none"
          />
          <Button
            label="Add package"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              const value = manualPackage.trim();
              if (value && !selectedPackages.includes(value)) {
                setSelectedPackages([...selectedPackages, value]);
                setManualPackage('');
              }
            }}
          />
        </Card>
      ) : null}

      {type === 'CATEGORY_LIMIT' ? (
        <Card title="Category">
          <View style={styles.chips}>
            {CATEGORIES.map(item => (
              <Button
                key={item}
                label={item.charAt(0) + item.slice(1).toLowerCase()}
                size="sm"
                fullWidth={false}
                variant={category === item ? 'primary' : 'secondary'}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {type === 'APP_LIMIT' || type === 'CATEGORY_LIMIT' ? (
        <Card title="Daily allowance">
          <AppText variant="display" style={styles.limitValue}>
            {formatMinutes(limitMinutes)}
          </AppText>
          <View style={styles.chips}>
            {LIMIT_PRESETS.map(minutes => (
              <Button
                key={minutes}
                label={formatMinutes(minutes)}
                size="sm"
                fullWidth={false}
                variant={limitMinutes === minutes ? 'primary' : 'secondary'}
                onPress={() => setLimitMinutes(minutes)}
              />
            ))}
          </View>
          <Field
            label="Custom minutes"
            value={String(limitMinutes)}
            onChangeText={value => {
              const parsed = parseInt(value.replace(/\D/g, ''), 10);
              if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 1440) {
                setLimitMinutes(parsed);
              } else if (value === '') {
                setLimitMinutes(0);
              }
            }}
            keyboardType="number-pad"
          />
        </Card>
      ) : null}

      {type === 'SCHEDULE' ? (
        <Card title="Window" subtitle="Blocks apply during this window each day">
          <View style={styles.chips}>
            {WEEKDAYS.map((label, index) => {
              const day = index + 1;
              const active = days.includes(day);
              return (
                <Button
                  key={label}
                  label={label}
                  size="sm"
                  fullWidth={false}
                  variant={active ? 'primary' : 'secondary'}
                  onPress={() => toggleDay(day)}
                />
              );
            })}
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Field
                label="Start"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="22:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeField}>
              <Field
                label="End"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="07:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <AppText variant="caption" tone="faint">
            Windows that cross midnight (start later than end) are supported.
          </AppText>
        </Card>
      ) : null}

      {error ? (
        <AppText variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Button
        label={createRule.isPending ? 'Saving…' : 'Save rule'}
        onPress={() => void onSave()}
        loading={createRule.isPending}
      />
      <Button
        label="Cancel"
        variant="ghost"
        onPress={() => navigation.goBack()}
        style={styles.cancel}
      />
    </Screen>
  );
}

function defaultName(type: EditorType): string {
  switch (type) {
    case 'APP_LIMIT':
      return 'App limit';
    case 'CATEGORY_LIMIT':
      return 'Category cap';
    case 'BLOCKLIST':
      return 'Blocked apps';
    default:
      return 'Schedule';
  }
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  limitValue: {
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  error: {
    marginBottom: spacing.md,
  },
  cancel: {
    marginTop: spacing.sm,
  },
});
